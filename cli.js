#!/usr/bin/env node

const yargs = require('yargs');
const inquirer = require('inquirer');
const path = require('path');
const fs = require('fs-extra');
const ejs = require('ejs');
const _ = require('lodash');

// --- Helper Functions ---
const helpers = {
    toKebabCase: (str) => _.kebabCase(str),
    toCamelCase: (str) => _.camelCase(str),
    toPascalCase: (str) => _.upperFirst(_.camelCase(str)),
};

/**
 * Defines the standard audit fields to be added to an entity.
 */
const AUDIT_FIELDS = [
    { fieldName: 'createdBy', fieldType: 'String', fieldTypeIsEnum: false, fieldValidateRules: [], comment: null },
    { fieldName: 'createdDate', fieldType: 'Instant', fieldTypeIsEnum: false, fieldValidateRules: [], comment: null },
    { fieldName: 'lastModifiedBy', fieldType: 'String', fieldTypeIsEnum: false, fieldValidateRules: [], comment: null },
    { fieldName: 'lastModifiedDate', fieldType: 'Instant', fieldTypeIsEnum: false, fieldValidateRules: [], comment: null },
];


/**
 * A robust JDL parser that reads a JDL string and extracts entities, enums, and relationships.
 * It now ignores commented out lines and recognizes an @EnableAudit annotation on the line preceding an entity definition.
 * It also captures inline comments for fields.
 * @param {string} jdlContent - The raw string content of the JDL file.
 * @returns {{entities: Array, enums: Array, relationships: Array}}
 */
function parseJdl(jdlContent) {
    const entities = {};
    const enums = {};
    const relationships = [];

    // First, remove all block comments to ignore them during parsing.
    const cleanContent = jdlContent.replace(/\/\*[\s\S]*?\*\//g, '');

    // 1. Parse Enums from the cleaned content
    const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
    let enumMatch;
    while ((enumMatch = enumRegex.exec(cleanContent)) !== null) {
        // Ignore if the match is inside a line comment
        if (isCommented(cleanContent, enumMatch.index)) continue;
        const enumName = enumMatch[1];
        const values = enumMatch[2].trim().split(',').map(v => v.trim().split('(')[0].trim()).filter(Boolean);
        enums[enumName] = { name: enumName, values: values.map(v => ({ name: v })) };
    }

    // 2. Parse Entities and their fields from the cleaned content
    const entityRegex = /(?:@EnableAudit\s+)?entity\s+(\w+)\s*\{([^}]+)\}/g;
    let entityMatch;
    while ((entityMatch = entityRegex.exec(cleanContent)) !== null) {
        if (isCommented(cleanContent, entityMatch.index)) continue;
        
        const hasAuditAnnotation = entityMatch[0].trim().startsWith('@EnableAudit');
        const entityName = entityMatch[1];
        const fieldsContent = entityMatch[2];
        
        const fields = [];
        const fieldLines = fieldsContent.split('\n').map(l => l.trim()).filter(line => line && !line.startsWith('//'));

        fieldLines.forEach(line => {
            const fieldMatch = line.match(/^(\w+)\s+([\w<>]+)(.*)/);
            if (fieldMatch) {
                const fieldName = fieldMatch[1];
                const fieldType = fieldMatch[2];
                const restOfLine = fieldMatch[3] || '';

                let validations = restOfLine;
                let comment = null;

                // Check for an inline comment and extract it.
                const commentIndex = restOfLine.indexOf('//');
                if (commentIndex !== -1) {
                    validations = restOfLine.substring(0, commentIndex).trim();
                    comment = restOfLine.substring(commentIndex + 2).trim();
                }
                
                fields.push({
                    fieldName,
                    fieldType,
                    fieldTypeIsEnum: !!enums[fieldType],
                    fieldValidateRules: validations.split(/\s+/).filter(Boolean),
                    comment, // Add the comment to the field model
                });
            }
        });
        
        if (hasAuditAnnotation) {
            console.log(`  -> Audit fields enabled for entity: ${entityName}`);
            fields.push(...AUDIT_FIELDS);
        }

        entities[entityName] = { name: entityName, fields };
    }

    // 3. Parse Relationships from the cleaned content
    const relationshipRegex = /relationship\s+(OneToOne|ManyToOne|OneToMany|ManyToMany)\s*\{\s*(\w+)(?:\((\w+)\))?\s+to\s+(\w+)(?:\((\w+)\))?\s*\}/g;
    let relMatch;
    while ((relMatch = relationshipRegex.exec(cleanContent)) !== null) {
        if (isCommented(cleanContent, relMatch.index)) continue;
        relationships.push({
            type: relMatch[1],
            from: { name: relMatch[2], fieldName: relMatch[3] },
            to: { name: relMatch[4], fieldName: relMatch[5] },
        });
    }

    return {
        entities: Object.values(entities),
        enums: Object.values(enums),
        relationships,
    };
}

/**
 * Checks if a match index is inside a commented line.
 * @param {string} content - The full content string.
 * @param {number} index - The index of the match.
 * @returns {boolean}
 */
function isCommented(content, index) {
    const lastNewline = content.lastIndexOf('\n', index);
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
    const line = content.substring(lineStart, index);
    return line.trim().startsWith('//');
}

/**
 * Maps JDL types to TypeScript types.
 * @param {string} jdlType - The type from the JDL file.
 * @returns {string} The corresponding TypeScript type.
 */
function getTsType(jdlType) {
    const typeMappings = {
        String: 'string',
        Integer: 'number',
        Long: 'number',
        BigDecimal: 'number',
        Float: 'number',
        Double: 'number',
        Boolean: 'boolean',
        LocalDate: 'dayjs.Dayjs',
        Instant: 'dayjs.Dayjs',
        ZonedDateTime: 'dayjs.Dayjs',
        TextBlob: 'string',
        UUID: 'string',
    };
    return typeMappings[jdlType] || jdlType; // Fallback to the original type for enums etc.
}


// --- Main Execution ---
async function run() {
    const argv = yargs
        .command('$0 <jdlFile> <outputFolder>', 'Generate Angular components from a JDL file', (yargs) => {
            yargs.positional('jdlFile', { describe: 'Path to the JDL file', type: 'string' })
                 .positional('outputFolder', { describe: 'Folder to generate the Angular app files in', type: 'string' });
        })
        .option('microservice', { alias: 'm', describe: 'Name of the microservice for API paths', type: 'string', demandOption: true })
        .option('apiHost', { alias: 'h', describe: 'The base host for the API (e.g., https://api.yourdomain.com)', type: 'string' })
        .help()
        .argv;

    const config = await gatherConfiguration(argv);

    console.log(`🔵 Parsing JDL file: ${config.jdlFile}`);
    const jdlContent = fs.readFileSync(config.jdlFile, 'utf-8');
    const { entities, enums, relationships } = parseJdl(jdlContent);

    if (!entities.length) {
        console.error('❌ No entities found in the JDL file. Exiting.');
        return;
    }

    console.log(`🚀 Generating Angular app in '${config.outputFolder}'...`);
    const generationPromises = [];

    entities.forEach(entity => {
        console.log(`  -> Generating files for entity: ${entity.name}`);
        generationPromises.push(generateEntityFiles(config, entity, relationships));
    });

    enums.forEach(enumDef => {
        console.log(`  -> Generating file for enum: ${enumDef.name}`);
        generationPromises.push(generateEnumFile(config, enumDef));
    });

    await Promise.all(generationPromises);

    console.log('\n✅ Angular structure generated successfully!');
}

async function gatherConfiguration(argv) {
    let config = { ...argv };
    if (!config.apiHost) {
        const answers = await inquirer.prompt([{
            type: 'input',
            name: 'apiHost',
            message: 'Enter API host (optional, leave blank for relative paths from /):',
            default: '',
        }]);
        config.apiHost = answers.apiHost;
    }
    return config;
}

// --- File Generation Logic ---

async function generateEntityFiles(config, entity, allRelationships) {
    // Add the TypeScript type to each field before rendering.
    entity.fields.forEach(field => {
        field.tsType = getTsType(field.fieldType);
    });

    const entityConfig = {
        ...helpers,
        entity,
        config,
        relationships: allRelationships
            .filter(rel => rel.from.name === entity.name)
            .map(rel => ({
                ...rel,
                otherEntityName: rel.to.name,
                otherEntityNamePascalCase: helpers.toPascalCase(rel.to.name),
                otherEntityNamePlural: `${rel.to.name.toLowerCase()}s`,
            })),
    };

    const outputBaseDir = path.join(config.outputFolder, 'entities', helpers.toKebabCase(entity.name));
    fs.ensureDirSync(outputBaseDir);

    const templates = [
        { template: '_entity_.model.ts.ejs',      subfolder: '',       outputPattern: '<%= entityName %>.model.ts' },
        { template: '_entity_.routes.ts.ejs',      subfolder: '',       outputPattern: '<%= entityName %>.routes.ts' },
        { template: '_entity_.service.ts.ejs',     subfolder: 'service',outputPattern: '<%= entityName %>.service.ts' },
        { template: '_entity_-form.service.ts.ejs',subfolder: 'update', outputPattern: '<%= entityName %>-form.service.ts' },
        { template: '_entity_-form.component.ts.ejs', subfolder: 'form', outputPattern: '<%= entityName %>-form.component.ts' },
        { template: '_entity_-form.component.html.ejs', subfolder: 'form', outputPattern: '<%= entityName %>-form.component.html' },
        { template: '_entity_-list.component.ts.ejs', subfolder: 'list',   outputPattern: '<%= entityName %>-list.component.ts' },
        { template: '_entity_-list.component.html.ejs', subfolder: 'list',   outputPattern: '<%= entityName %>-list.component.html' },
    ];

    for (const t of templates) {
        const templatePath = path.join(__dirname, 'templates', 'angular', '_entity_', t.subfolder, t.template);
        
        const fileContent = await ejs.renderFile(templatePath, entityConfig);
        
        const finalSubfolder = t.subfolder ? path.join(outputBaseDir, t.subfolder) : outputBaseDir;
        fs.ensureDirSync(finalSubfolder);

        const outputFileName = ejs.render(t.outputPattern, { entityName: helpers.toKebabCase(entity.name) });

        fs.writeFileSync(path.join(finalSubfolder, outputFileName), fileContent);
    }
}

async function generateEnumFile(config, enumDef) {
    const enumConfig = { ...helpers, enumDef };
    const templatePath = path.join(__dirname, 'templates', 'angular', 'enums', '_enum_.model.ts.ejs');
    const fileContent = await ejs.renderFile(templatePath, enumConfig);
    
    const outputDir = path.join(config.outputFolder, 'enums');
    fs.ensureDirSync(outputDir);

    const outputFileName = `${helpers.toKebabCase(enumDef.name)}.model.ts`;
    fs.writeFileSync(path.join(outputDir, outputFileName), fileContent);
}

// --- Run the tool ---
run().catch(error => console.error('❌ An error occurred:', error));

# Hipster Wind

[![NPM Version](https://img.shields.io/npm/v/tw-hipster.svg)](https://www.npmjs.com/package/tw-hipster)
[![NPM License](https://img.shields.io/npm/l/tw-hipster.svg)](https://www.npmjs.com/package/tw-hipster)

A powerful command-line tool to generate modern, standalone Angular components from a JHipster JDL file.

![tw-hipster](https://dl3.pushbulletusercontent.com/t8yw4uwEB1dQWXeep8N4LhYBZ8ZjGfEF/Gemini_Generated_Image_g0m55yg0m55yg0m5%20(1).png)

---

## What is this?

JHipster is an incredible platform for generating full-stack applications. However, the generated Angular frontends can sometimes be complex, tied to an older module-based architecture, and may require significant effort to customize.

**`tw-hipster` is the solution.**

It takes the best part of JHipster—the powerful JDL for defining your data model—and generates a clean, modern, and highly maintainable Angular frontend structure. It's designed to be lightweight, standalone, and easy to integrate into any Angular project that uses Material Design.

## What does it generate?

For each entity defined in your JDL, `tw-hipster` creates a complete set of files following modern Angular best practices:

* **Standalone Components**: A list component with a data table, sorting, pagination, and a side-drawer for creating and editing records. No `ngModule` required.
* **Typed Reactive Forms**: A dedicated form service (`entity-form.service.ts`) that creates a strongly-typed `FormGroup` for your entity.
* **Data Services**: A clean service (`entity.service.ts`) for handling all HTTP operations (CRUD), with date handling and request options built-in.
* **TypeScript Models**: Interfaces for your entities (`entity.model.ts`) and TypeScript enums (`enum.model.ts`).
* **Routing**: A pre-configured routes file (`entity.routes.ts`) for easy integration into your application's router.

---

## Installation

Install the tool globally using npm.

```bash
npm install -g tw-hipster
```

---

## Usage

Run the tool from your terminal, providing the path to your JDL file, the desired output folder, and the name of the backend microservice.

### Syntax

```bash
tw-hipster <jdlFile> <outputFolder> --microservice <microserviceName> [--apiHost <host>]
```

### Arguments

-   `<jdlFile>`: **(Required)** The path to your JHipster JDL file (e.g., `./my-app.jh`).
-   `<outputFolder>`: **(Required)** The directory where the generated files will be placed (e.g., `./generated-app`).
-   `--microservice`: **(Required)** The name of the microservice the API belongs to (e.g., `analytics-module`).
-   `--apiHost`: **(Optional)** The full base URL of your API (e.g., `https://api.yourdomain.com`). If not provided, you will be prompted to enter it.

### Example

```bash
tw-hipster ./naqda.jh ./generated-app --microservice analytics-and-iot-module
```

---

## Integrating the Generated Code

After running the tool, you will have a new folder (e.g., `generated-app`) containing `entities` and `enums` directories.

1.  **Copy Folders**: Copy the generated `entities` and `enums` folders into your Angular project's `src/app/` directory.
2.  **Configure Routes**: Open your main `app.routes.ts` and import the generated routes for each entity.
    ```typescript
    // src/app/app.routes.ts
    import { Routes } from '@angular/router';
    
    export const routes: Routes = [
      {
        path: 'officers',
        loadChildren: () => import('./entities/officer/officer.routes').then(m => m.officerRoutes)
      },
      // ... other routes
    ];
    ```
3.  **Install Dependencies**: Ensure your project has the required dependencies, such as Angular Material and Day.js.

---

## Development

To contribute to `tw-hipster` or run it locally:

1.  **Clone & Install**:
    ```bash
    git clone <your-repository-url>
    cd tw-hipster-cli
    npm install
    ```

2.  **Link for Local Use**:
    ```bash
    npm link
    ```
    This will allow you to run the `tw-hipster` command globally on your machine, pointing to your local source code.

---

## License

This project is licensed under the MIT License.

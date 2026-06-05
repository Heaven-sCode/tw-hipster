import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

type ConfirmationColor = 'blue' | 'amber' | 'rose' | 'violet' | 'emerald';

type ConfirmationDialogData = {
  title: string;
  message: string;
  color?: ConfirmationColor;
};

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
      <div class="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" [ngClass]="iconClasses()">
            <mat-icon svgIcon="shield-alert" class="text-current"></mat-icon>
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{{ data.title }}</h2>
            <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ data.message }}</p>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-end gap-3 px-6 py-4">
        <button mat-stroked-button type="button" class="min-w-24" (click)="close(false)">Cancel</button>
        <button mat-flat-button type="button" class="min-w-24" [ngClass]="actionClasses()" (click)="close(true)">Confirm</button>
      </div>
    </div>
  `,
})
export class ConfirmationDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ConfirmationDialogComponent, boolean>);
  readonly data = inject(MAT_DIALOG_DATA) as ConfirmationDialogData;

  readonly theme = computed(() => this.data.color ?? 'blue');

  readonly iconClasses = computed(() => {
    switch (this.theme()) {
      case 'amber':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300';
      case 'rose':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300';
      case 'violet':
        return 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300';
      case 'emerald':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
      default:
        return 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300';
    }
  });

  readonly actionClasses = computed(() => {
    switch (this.theme()) {
      case 'amber':
        return 'bg-amber-500 text-white hover:bg-amber-600';
      case 'rose':
        return 'bg-rose-600 text-white hover:bg-rose-700';
      case 'violet':
        return 'bg-violet-600 text-white hover:bg-violet-700';
      case 'emerald':
        return 'bg-emerald-600 text-white hover:bg-emerald-700';
      default:
        return 'bg-sky-600 text-white hover:bg-sky-700';
    }
  });

  close(result: boolean): void {
    this.dialogRef.close(result);
  }
}

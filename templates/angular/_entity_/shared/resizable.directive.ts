// This file is generated as part of the Angular entity template.
// It provides a reusable directive to make table header cells resizable.
// The directive reads/writes column widths to localStorage so that the size
// persists across page reloads.

import { Directive, ElementRef, Input, OnInit, OnDestroy, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appResizable]',
  exportAs: 'appResizable',
  standalone: true
})
export class ResizableDirective implements OnInit, OnDestroy {
  /**
   * The column identifier – should match the value used in the `matColumnDef`.
   */
  @Input('appResizable') columnKey!: string;

  /**
   * Identifier for the table instance. Using the entity name (kebab‑case) gives
   * a unique storage key per entity.
   */
  @Input() tableId!: string;

  private mouseMoveListener?: () => void;
  private mouseUpListener?: () => void;
  private startX = 0;
  private startWidth = 0;

  constructor(private el: ElementRef<HTMLElement>, private renderer: Renderer2) {}

  ngOnInit(): void {
    // Apply any persisted width.
    const saved = this.getSavedWidth();
    if (saved) {
      this.renderer.setStyle(this.el.nativeElement, 'width', `${saved}px`);
    }
    // Ensure the element is positioned correctly for resizing.
    this.renderer.setStyle(this.el.nativeElement, 'position', 'relative');
    // Add a resize handle.
    const handle = this.renderer.createElement('span');
    this.renderer.addClass(handle, 'resize-handle');
    this.renderer.setStyle(handle, 'position', 'absolute');
    this.renderer.setStyle(handle, 'right', '0');
    this.renderer.setStyle(handle, 'top', '0');
    this.renderer.setStyle(handle, 'bottom', '0');
    this.renderer.setStyle(handle, 'width', '4px');
    this.renderer.setStyle(handle, 'cursor', 'col-resize');
    this.renderer.setStyle(handle, 'user-select', 'none');
    this.renderer.appendChild(this.el.nativeElement, handle);
    // Listen for mousedown on the handle.
    this.renderer.listen(handle, 'mousedown', (event: MouseEvent) => this.onMouseDown(event));
  }

  ngOnDestroy(): void {
    this.unbindDocumentEvents();
  }

  private onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.startX = event.pageX;
    this.startWidth = this.el.nativeElement.offsetWidth;
    // Bind move/up listeners on the document so we capture events even if the
    // cursor leaves the header cell.
    this.mouseMoveListener = this.renderer.listen('document', 'mousemove', (e: MouseEvent) => this.onMouseMove(e));
    this.mouseUpListener = this.renderer.listen('document', 'mouseup', () => this.onMouseUp());
  }

  private onMouseMove(event: MouseEvent): void {
    const delta = event.pageX - this.startX;
    const newWidth = Math.max(this.startWidth + delta, 30); // enforce a sensible minimum
    this.renderer.setStyle(this.el.nativeElement, 'width', `${newWidth}px`);
  }

  private onMouseUp(): void {
    const finalWidth = this.el.nativeElement.offsetWidth;
    this.saveWidth(finalWidth);
    this.unbindDocumentEvents();
  }

  private unbindDocumentEvents(): void {
    if (this.mouseMoveListener) {
      this.mouseMoveListener();
      this.mouseMoveListener = undefined;
    }
    if (this.mouseUpListener) {
      this.mouseUpListener();
      this.mouseUpListener = undefined;
    }
  }

  private storageKey(): string {
    return `${this.tableId}-${this.columnKey}-width`;
  }

  private getSavedWidth(): number | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(this.storageKey());
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? null : parsed;
  }

  private saveWidth(width: number): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.storageKey(), width.toString());
  }
}


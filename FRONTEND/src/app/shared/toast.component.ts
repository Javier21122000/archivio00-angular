import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideCheck, LucideCircleAlert, LucideX } from '@lucide/angular';
import { UiService } from '../core/services/ui.service';

@Component({
  selector: 'app-toast',
  imports: [LucideCheck, LucideCircleAlert, LucideX],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ui.toast(); as toast) {
      <div class="toast" [class.toast-error]="toast.error" [attr.role]="toast.error ? 'alert' : 'status'">
        @if (toast.error) { <svg lucideCircleAlert [size]="19"></svg> } @else { <svg lucideCheck [size]="19"></svg> }
        <span>{{ toast.message }}</span>
        <button type="button" aria-label="Chiudi notifica" (click)="ui.clearToast()"><svg lucideX [size]="17"></svg></button>
      </div>
    }
  `,
})
export class ToastComponent {
  protected readonly ui = inject(UiService);
}

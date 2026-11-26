import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

/** GIF e WebP animate vanno in un <img>: un <video> non le riproduce. */
export function isAnimatedImage(url: string): boolean {
  return /\.(gif|webp|apng|png)$/i.test(url);
}

/**
 * Sfondo animato della pagina leggenda. Se il filmato manca (o il browser non lo
 * carica) resta il ritratto con una lentissima carrellata: (error) e' l'unico modo
 * affidabile per accorgersene, un <video> senza sorgente valida mostrerebbe comunque il poster.
 */
@Component({
  selector: 'app-legend-backdrop',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="leggenda-sfondo" aria-hidden="true">
      @if (clip(); as src) {
        @if (animatedImage()) {
          <img [src]="src" alt="" (error)="missing.set(true)" />
        } @else {
          <video [src]="src" [poster]="portrait()" autoplay muted loop playsinline preload="metadata" (error)="missing.set(true)"></video>
        }
      } @else {
        <img [src]="portrait()" alt="" class="leggenda-sfondo-fermo" />
      }
      <span class="leggenda-sfondo-velo"></span>
    </div>
  `,
})
export class LegendBackdropComponent {
  readonly video = input<string>();
  readonly portrait = input.required<string>();

  /** Diventa true quando il filmato non si carica: da li' in poi si usa il ritratto. */
  protected readonly missing = signal(false);
  protected readonly clip = computed(() => (this.missing() ? undefined : this.video()));
  protected readonly animatedImage = computed(() => isAnimatedImage(this.video() ?? ''));
}

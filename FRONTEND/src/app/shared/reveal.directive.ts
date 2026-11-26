import { Directive, ElementRef, OnDestroy, OnInit, inject, input } from '@angular/core';

/**
 * Anima l'ingresso nel viewport (opacity + translate) con IntersectionObserver.
 * Le classi CSS stanno in styles.css (.reveal / .reveal-in). Con prefers-reduced-motion
 * l'elemento e' subito visibile e nessun observer viene creato.
 */
@Directive({ selector: '[appReveal]' })
export class RevealDirective implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private observer?: IntersectionObserver;

  /** Ritardo in ms, utile per scaglionare le card di una griglia. */
  readonly delay = input(0, { alias: 'appRevealDelay' });

  ngOnInit(): void {
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; // jsdom non ha matchMedia
    if (reduced || typeof IntersectionObserver === 'undefined') return;
    this.el.classList.add('reveal');
    this.el.style.transitionDelay = `${this.delay()}ms`;
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        this.el.classList.add('reveal-in');
        this.observer?.disconnect(); // una volta sola
      },
      { threshold: 0.12 },
    );
    this.observer.observe(this.el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}

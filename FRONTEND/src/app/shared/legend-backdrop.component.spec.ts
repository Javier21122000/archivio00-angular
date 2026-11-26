import { TestBed } from '@angular/core/testing';
import { isAnimatedImage, LegendBackdropComponent } from './legend-backdrop.component';

function create(video: string | undefined) {
  const fixture = TestBed.createComponent(LegendBackdropComponent);
  fixture.componentRef.setInput('video', video);
  fixture.componentRef.setInput('portrait', '/images/leggende/messi.jpg');
  fixture.detectChanges();
  return fixture;
}

describe('isAnimatedImage', () => {
  it('riconosce GIF e WebP animate, non i video', () => {
    expect(isAnimatedImage('/videos/a.webp')).toBe(true);
    expect(isAnimatedImage('/videos/a.GIF')).toBe(true);
    expect(isAnimatedImage('/videos/a.mp4')).toBe(false);
    expect(isAnimatedImage('')).toBe(false);
  });
});

describe('LegendBackdropComponent', () => {
  it('usa <img> per una WebP animata e <video> per un mp4', () => {
    const img = create('/videos/messi.webp').nativeElement as HTMLElement;
    expect(img.querySelector('video')).toBeNull();
    expect(img.querySelector('img')?.getAttribute('src')).toBe('/videos/messi.webp');

    const vid = create('/videos/messi.mp4').nativeElement as HTMLElement;
    expect(vid.querySelector('video')).not.toBeNull();
  });

  it('senza filmato mostra il ritratto con la carrellata', () => {
    const el = create(undefined).nativeElement as HTMLElement;
    expect(el.querySelector('img.leggenda-sfondo-fermo')?.getAttribute('src')).toBe('/images/leggende/messi.jpg');
  });

  it('se il filmato non si carica ripiega sul ritratto', () => {
    const fixture = create('/videos/rotto.webp');
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector('img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(el.querySelectorAll('img').length).toBe(1);
    expect(el.querySelector('img')?.classList.contains('leggenda-sfondo-fermo')).toBe(true);
  });
});

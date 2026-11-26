import { TestBed } from '@angular/core/testing';
import { UiService } from './ui.service';

describe('UiService toast', () => {
  let ui: UiService;
  beforeEach(() => {
    vi.useFakeTimers();
    ui = TestBed.inject(UiService);
  });
  afterEach(() => vi.useRealTimers());

  it('un toast normale sparisce dopo 4500 ms', () => {
    ui.notify('ok');
    expect(ui.toast()).toEqual({ message: 'ok', error: false });
    vi.advanceTimersByTime(4499);
    expect(ui.toast()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(ui.toast()).toBeNull();
  });

  it('un errore resta 8000 ms', () => {
    ui.notify('ko', true);
    vi.advanceTimersByTime(7999);
    expect(ui.toast()?.error).toBe(true);
    vi.advanceTimersByTime(1);
    expect(ui.toast()).toBeNull();
  });

  it('un nuovo toast riavvia il timer', () => {
    ui.notify('uno');
    vi.advanceTimersByTime(4000);
    ui.notify('due');
    vi.advanceTimersByTime(4000);
    expect(ui.toast()?.message).toBe('due');
  });

  it('openAuth chiude il drawer', () => {
    ui.setTestDrawer(true);
    ui.openAuth('register');
    expect(ui.authMode()).toBe('register');
    expect(ui.testDrawer()).toBe(false);
  });
});

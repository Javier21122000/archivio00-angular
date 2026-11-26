import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { UiService } from './core/services/ui.service';
import { AccessDrawerComponent } from './layout/access-drawer.component';
import { AuthModalComponent } from './layout/auth-modal.component';
import { FooterComponent } from './layout/footer.component';
import { NavbarComponent } from './layout/navbar.component';
import { ToastComponent } from './shared/toast.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, FooterComponent, AuthModalComponent, AccessDrawerComponent, ToastComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  protected readonly ui = inject(UiService);

  constructor() {
    // La sessione e' solo in memoria: ogni caricamento parte da Guest (niente token persistenti: meno superficie di attacco per XSS).
    inject(AuthService).clearSession();
  }
}

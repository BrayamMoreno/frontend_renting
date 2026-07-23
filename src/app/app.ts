import {ChangeDetectionStrategy, Component, inject, signal, OnInit} from '@angular/core';
import {RouterOutlet, RouterLink, RouterLinkActive, Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatTooltipModule} from '@angular/material/tooltip';
import {CommonModule} from '@angular/common';
import {AuthService} from './services/auth.service';
import {StorageService} from './services/storage';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  authService = inject(AuthService);
  storage = inject(StorageService);
  router = inject(Router);

  inventarioDropdownOpen = signal(false);

  toggleInventarioDropdown() {
    this.inventarioDropdownOpen.update(v => !v);
  }

  isInventarioRouteActive(): boolean {
    const url = this.router.url;
    return url.includes('/inventario') || url.includes('/pendientes-devolucion') || url.includes('/bajas');
  }

  ngOnInit() {
    if (this.isInventarioRouteActive()) {
      this.inventarioDropdownOpen.set(true);
    }
  }
}


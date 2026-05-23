import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

import { provideHttpClient} from '@angular/common/http';
import { PokemonDetailComponent } from './components/pokemon-detail/pokemon-detail';
import { PokemonListComponent } from './components/pokemon-list/pokemon-list';
import { PokemonService } from './services/pokemon';

// @NgModule({
//   declarations: [ PokemonDetailComponent,PokemonListComponent,PokemonService ],
//   imports: [
//     provideBrowserGlobalErrorListeners,
//     provideHttpClient // ¡Agrega esta línea aquí!
//   ],
//   providers: [],
//   bootstrap: [AppComponent]
// })
// export class AppModule { }

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient()
  ]
};

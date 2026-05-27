import { Routes } from '@angular/router';
import { ListaPokemon } from '../components/lista-pokemon/lista-pokemon';
import { DetallePokemon } from '../components/detalle-pokemon/detalle-pokemon';
import { FiltroRegiones } from '../components/filtro-regiones/filtro-regiones';

export const routes: Routes = [
  { path: '', component: ListaPokemon },
  { path: 'pokemon/:id', component: DetallePokemon },
  { path: 'generacion/:num', component: FiltroRegiones }
];

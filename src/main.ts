import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

let backgrounds = []

backgrounds [0] = '/assets/fondos/Fondo1.jpg'
backgrounds [1] = '/assets/fondos/Fondo2.jpg'
backgrounds [2] = '/assets/fondos/Fondo3.jpg'
backgrounds [3] = '/assets/fondos/Fondo4.jpg'
backgrounds [4] = '/assets/fondos/Fondo5.jpg'

window.onload = function () {
    let setBackground = Math.floor(Math.random() * backgrounds.length);
    document.body.style.backgroundImage = `url(${backgrounds[setBackground]})`
}
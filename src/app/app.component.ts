import { Component } from '@angular/core';
import * as firebase from 'firebase';

const config = {
  apiKey: 'AIzaSyAGFrZHTceDIf-ark_NZLrLryBUhra6KGo',
  databaseURL: 'https://palaver-58928.firebaseio.com/'
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'discussion-markets';

  constructor() {
    firebase.initializeApp(config);
  }
}

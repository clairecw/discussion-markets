import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AngularFireModule } from '@angular/fire';
import { AngularFirestoreModule } from '@angular/fire/firestore';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { RoomlistComponent } from './roomlist/roomlist.component';
import { AddroomComponent } from './addroom/addroom.component';
import { ChatroomComponent } from './chatroom/chatroom.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
// import { MatToolbarModule } from '@angular/material/toolbar';
import { OrdinalPipe } from './chatroom/ordinal.pipe';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule } from '@angular/material/sort';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { DatePipe } from '@angular/common';
import { CountdownModule } from 'ngx-countdown';

const firebaseConfig = {
  apiKey: 'AIzaSyAGFrZHTceDIf-ark_NZLrLryBUhra6KGo',
  databaseURL: 'https://palaver-58928.firebaseio.com/',
  // authDomain: "<Firebase auth domain>",
  // projectId: "<Firebase project ID>",
  // storageBucket: "<Firebase storage bucket>",
  // messagingSenderId: "<Firebase messaging sender ID>",
};

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RoomlistComponent,
    AddroomComponent,
    ChatroomComponent,
    OrdinalPipe

  ],
  imports: [
    BrowserModule,
    CountdownModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatSliderModule,
    MatButtonModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatSortModule,
    MatSnackBarModule,
    MatSidenavModule,
    
  ],
  providers: [DatePipe],
  bootstrap: [AppComponent]
})
export class AppModule { }

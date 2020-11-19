import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as firebase from 'firebase';
import { DatePipe } from '@angular/common';

export const snapshotToArray = (snapshot: any) => {
  const returnArr = [];

  snapshot.forEach((childSnapshot: any) => {
      const item = childSnapshot.val();
      item.key = childSnapshot.key;
      returnArr.push(item);
  });

  return returnArr;
};

@Component({
  selector: 'app-roomlist',
  templateUrl: './roomlist.component.html',
  styleUrls: ['./roomlist.component.css']
})
export class RoomlistComponent implements OnInit {

  nickname = ''; userId = '';
  displayedColumns: string[] = ['roomname'];
  rooms = [];
  isLoadingResults = true;

  constructor(private route: ActivatedRoute, private router: Router, public datepipe: DatePipe) {
    this.nickname = localStorage.getItem('nickname');
    // TODO: localStorage.getItem('userId');
    firebase.database().ref('rooms/').on('value', resp => {
      this.rooms = [];
      this.rooms = snapshotToArray(resp);
      this.isLoadingResults = false;
    });
  }

  ngOnInit(): void {
    firebase.database().ref('users/').orderByChild('nickname').equalTo(this.nickname).on('value', (resp: any) => {
      let users = [];
      users = snapshotToArray(resp);
      const user = users.find(x => x.nickname === this.nickname);
      if (user !== undefined) {
        this.userId = user.key;
      }
    });
  }

  enterChatRoom(roomname: string, key: string) {

    const userRef = firebase.database().ref('users/' + this.userId);
    userRef.update({current_room: key, status: 'online'});
    firebase.database().ref('rooms/' + key + '/users/').child(this.userId).set(this.nickname);
    
    // firebase.database().ref('roomusers/').orderByChild('roomname').equalTo(roomname).on('value', (resp: any) => {
    //   let roomuser = [];
    //   roomuser = snapshotToArray(resp);
    //   const user = roomuser.find(x => x.nickname === this.nickname);
    //   if (user !== undefined) {
    //     const userRef = firebase.database().ref('roomusers/' + user.key);
    //     userRef.update({status: 'online', roomname: roomname});
    //   } else {
    //     const newroomuser = { roomname: '', nickname: '', status: '' };
    //     newroomuser.roomname = roomname;
    //     newroomuser.nickname = this.nickname;
    //     newroomuser.status = 'online';
    //     firebase.database().ref('roomusers/').child(this.userId).set(newroomuser);
    //   }
    // });

    this.router.navigate(['/chatroom', roomname]);
  }

  logout(): void {
    localStorage.removeItem('nickname');
    this.router.navigate(['/login']);
  }

}

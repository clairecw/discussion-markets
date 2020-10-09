import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormControl, FormGroupDirective, FormBuilder, FormGroup, NgForm, Validators } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import * as firebase from 'firebase';
import { CountdownComponent } from 'ngx-countdown';
import { DatePipe } from '@angular/common';

export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
  }
}

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
  selector: 'app-chatroom',
  templateUrl: './chatroom.component.html',
  styleUrls: ['./chatroom.component.css']
})
export class ChatroomComponent implements OnInit {

  // @ViewChild('chatcontent') chatcontent: ElementRef;
  @ViewChild('countdown', { static: false }) private countdown: CountdownComponent;
  scrolltop: number = null;

  chatForm: FormGroup;
  nickname = ''; userId = '';
  roomname = ''; userId2Nickname = null;
  users = []; status = 'general';

  cd_time = -1;
  endowment = 0; current_speaker_nickname = 'no one';
  bid = 0; top_bid = 0;
  top_bidder = "no one"; current_speaker = "no one"
  room = null; roomRef = null; user = null;

  SPEAKING_MINS = 2

  matcher = new MyErrorStateMatcher();

  constructor(private router: Router,
              private route: ActivatedRoute,
              private formBuilder: FormBuilder,
              public datepipe: DatePipe,
              private ref: ChangeDetectorRef) {
    this.nickname = localStorage.getItem('nickname');
    this.userId2Nickname = new Map([
      ["no one", "no one"]
  ]);
    this.roomname = this.route.snapshot.params.roomname;
    firebase.database().ref('roomusers/').orderByChild('roomname').equalTo(this.roomname).on('value', (resp2: any) => {
      const roomusers = snapshotToArray(resp2);
      this.users = roomusers.filter(x => x.nickname != 'admin');
      for (let user of this.users) {
        this.userId2Nickname.set(user.key, user.nickname);
      }
    });
  }

  ngOnInit(): void {
    // this.countdown.stop();
    this.chatForm = this.formBuilder.group({
      'message' : [null, Validators.required]
    });

    firebase.database().ref('users/').orderByChild('nickname').equalTo(this.nickname).on('value', (resp: any) => {
      let users = [];
      users = snapshotToArray(resp);
      this.user = users.find(x => x.nickname === this.nickname);
      if (this.user !== undefined) {
        this.endowment = this.user.endowment;
        this.userId = this.user.key;
      }
    });
    
    firebase.database().ref('rooms/').orderByChild('roomname').equalTo(this.roomname).on('value', (resp: any) => {
      this.room = snapshotToArray(resp)[0];
      this.status = this.room.status;
      if (this.room.end_time == null) {
        this.cd_time = null;
      }
      else {
        this.cd_time = (this.room.end_time - (new Date).getTime()) / 1000;

      }
      this.top_bid = this.room.top_bid;
      // if (this.top_bid == 0) {
      //   this.bid = 0;
      // }
      this.current_speaker = this.room.current_speaker;
      this.top_bidder = this.room.top_bidder;
      this.roomRef = firebase.database().ref('rooms/' + this.room.key);

      console.log("userIDMap");
      console.log(this.userId2Nickname);

      console.log("current_speaker: " + this.current_speaker);

      this.current_speaker_nickname = this.userId2Nickname.get(this.current_speaker);
      console.log("current_speaker_nickname " + this.current_speaker_nickname);
      console.log("room updated:" + this.status + ", " + this.top_bid + ", " + this.current_speaker + ", " + this.end_time);
      console.log("cd_time:" + this.cd_time);

      this.ref.detectChanges();

      if (this.cd_time < 0) {
        this.resetAuction(null);
      }
    });
  }

  resetAuction(first_round) {
    let changes = {top_bid: 0, current_speaker: "no one", end_time: null, top_bidder: "no one"};
    if (first_round == null) {
      this.roomRef.update(changes);
      return;
    }
    if (first_round) {
      changes['status'] = 'first_round';
    }
    else {
      changes['status'] = 'general';
    }
    this.roomRef.update(changes);

  }

  deleteBidHistory() {
    this.roomRef.update({bids: null});
  }

  exitChat() {
    firebase.database().ref('roomusers/').orderByChild('roomname').equalTo(this.roomname).on('value', (resp: any) => {
      let roomuser = [];
      roomuser = snapshotToArray(resp);
      const user = roomuser.find(x => x.nickname === this.nickname);
      if (user !== undefined) {
        const userRef = firebase.database().ref('roomusers/' + user.key);
        userRef.update({status: 'offline'});
      }
    });

    this.router.navigate(['/roomlist']);
  }

  startDiscussion() {
    if (this.room !== null) {
      const roomRef = firebase.database().ref('rooms/' + this.room.key);
      roomRef.update({status: 'first_round'});
    }
  }

  makeBid(event) {
    console.log("made a bid");
    const bidRef = firebase.database().ref('rooms/' + this.room.key + '/bids');
    // bidRef.set({this.nickname: this.bid});
    const newBid = bidRef.push();
    newBid.set({user: this.user.key, amount: this.bid, ts: (new Date).getTime()});
    // const roomRef = firebase.database().ref('rooms/' + this.room.key);
    if (this.status == 'first_round') {
      this.roomRef.update({status: 'general', 
                      current_speaker: this.userId,
                      end_time: (new Date).getTime() + this.SPEAKING_MINS * 60000,
                      top_bidder: "no one", top_bid: 0
                    });
      
      // subtract endowment here?
    }
    else if (this.room.status == 'general') {
        if (this.top_bid < this.bid) {
          this.roomRef.update({top_bid: this.bid, top_bidder: this.userId});
        
      }
    }
  }

  finishSpeaking(e) {
    if (e.action == 'done' && this.current_speaker == this.userId) {
      console.log("finished speaking");
      firebase.database().ref('users/').orderByKey().equalTo(this.userId).on('value', (resp: any) => {
        const speakingUserRef = firebase.database().ref('users/' + this.userId);
        const speakingUser = snapshotToArray(resp)[0];
        const oldEndowment = speakingUser.endowment;
        speakingUserRef.update({endowment: oldEndowment - this.top_bid});
      });

      firebase.database().ref('rooms/').orderByChild('roomname').equalTo(this.roomname).on('value', (resp: any) => {
        this.room = snapshotToArray(resp)[0];
        const roomRef = firebase.database().ref('rooms/' + this.room.key);

        if (this.top_bid == 0) {
          this.resetAuction(true);
          return;
        }
        const top_bidder = this.room.top_bidder;
        // set a new current speaker
        roomRef.update({status: 'general', 
                        current_speaker: top_bidder,
                        end_time: (new Date).getTime() + this.SPEAKING_MINS * 60000,
                        top_bid: 0, top_bidder: "no one"});
        this.current_speaker = top_bidder;

      });

      // reset the auction
      this.top_bid = 0;
    }
  }

}

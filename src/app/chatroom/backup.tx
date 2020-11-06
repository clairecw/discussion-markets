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

  @ViewChild('countdown', { static: false }) private countdown: CountdownComponent;
  scrolltop: number = null;

  roomForm: FormGroup; topupForm: FormGroup;

  nickname = ''; userId = '';
  roomname = ''; userId2Nickname = null;
  users = []; status = 'closed';

  cd_time = -1;
  endowment = 0; current_speaker_nickname = 'no one';
  bid = 0; top_bid = 0; bid_position = -1;
  top_bidder = "no one"; current_speaker = "no one"
  roomRef = null; user = null;
  show_mat_card = false; userStats = {};

  // default value
  room = {max_speaking_mins: 2, status: 'closed', end_time: -1,
          top_bid: 0, current_speaker: "no one", key: '000'};
  
  displayedColumns: string[] = ['name', 'amount'];

  all_bids = [];

  SPEAKING_MINS = 1

  DEBUG = false;

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
    this.roomForm = this.formBuilder.group({
      'max_speaking_mins' : [null]
    });
    this.topupForm = this.formBuilder.group({
      'amount' : [null]
    });

    // if (this.nickname == 'admin') {
    //   const cbRef = firebase.database().ref('rooms/' + this.room.key + '/current_bids');
    //   cbRef.orderByValue().on('value', (resp: any) => {
    //     this.all_bids = snapshotToArray(resp);
    //   });
    // }

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
      let room = snapshotToArray(resp)[0];
      if (this.room.status != 'closed' && room.status == 'closed') {
        this.displayUserStats();
      }
      this.room = room;
      this.status = this.room.status;
      if (this.room.end_time == null) {
        this.cd_time = null;
      }
      else {
        this.cd_time = (this.room.end_time - (new Date).getTime()) / 1000;

      }
      this.top_bid = this.room.top_bid;
      
      this.current_speaker = this.room.current_speaker;
      // this.top_bidder = this.room.top_bidder;
      if (this.roomRef == null) this.roomRef = firebase.database().ref('rooms/' + this.room.key);
      this.current_speaker_nickname = this.userId2Nickname.get(this.current_speaker);
      const roomRef = firebase.database().ref('rooms/' + this.room.key + '/current_bids');
      roomRef.orderByValue().on('value', (resp: any) => {
        let current_bids = snapshotToArray(resp);
        this.bid_position = current_bids.indexOf(this.userId);

      });

      if (this.nickname == 'admin') {
        firebase.database().ref('rooms/' + this.room.key + '/current_bids').orderByValue().on('value', (resp: any) => {
          this.all_bids = snapshotToArray(resp);
        });
      }

      if (this.DEBUG) {
        console.log("current_speaker: " + this.current_speaker);
        console.log("current_speaker_nickname " + this.current_speaker_nickname);
        console.log("room updated:" + this.status + ", " + this.top_bid + ", " + this.current_speaker + ", " + this.cd_time);
      }

      this.ref.detectChanges();

      // if (this.cd_time < 0) {
      //   this.resetAuction(null);
      // }
    });
  }

  // Display this user's stats at the end of the round.
  displayUserStats() {
    firebase.database().ref('users/' + this.userId).on('value', (resp: any) => {
      const userInfo = snapshotToArray(resp)[0];
      this.userStats['numBids'] = userInfo.current_discussion.bid_history.length;
      let ts = 0;
      for (let x of userInfo.current_discussion.speaking_history) {
        ts += (x.end - x.start);
      }
      this.userStats['timeSpoken'] = ts;
      this.userStats['spent'] = userInfo.endowment - userInfo.current_discussion.startEndowment;
      
      this.show_mat_card = true;
    });
  }

  // Display global stats to admin at the end of the round. 
  displayGlobalStats() {

  }

  resetAuction(first_round) {
    console.log("huh");
    let changes = {top_bid: 0, current_speaker: "no one", end_time: null, };
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
    this.roomRef.update({bid_history: null});
    this.roomRef.update({current_bids: null});
  }

  onFormSubmit(form: any) {
    this.roomRef.update(form);
  }
  topUp(form: any) {
    firebase.database().ref('users/').orderByKey().on('value', (resp: any) => {
      const userRef = firebase.database().ref('users/' + this.userId);

      for (let user of snapshotToArray(resp)) {
        if (user.nickname != 'admin') {
          console.log("old endow: " + user.endowment);
          let userRef = firebase.database().ref('users/' + user.key);
          userRef.update({endowment: user.endowment + form['amount']});

        }
        
      }
    });
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

  endDiscussion() {
    if (this.room !== null) {
      const roomRef = firebase.database().ref('rooms/' + this.room.key);
      roomRef.update({status: 'closed'});
    }
  }

  // This user starts speaking.
  kickOffSpeaking() {
    firebase.database().ref('users/').orderByKey().equalTo(this.userId).on('value', (resp: any) => {
      let user = snapshotToArray(resp)[0];
      if (!user.currently_speaking && this.room.current_speaker != this.userId) {
        console.log("kicked off speaking");

        this.roomRef.update({status: 'general', 
          current_speaker: this.userId,
          end_time: (new Date).getTime() + this.SPEAKING_MINS * 60000,
          top_bid: 0
        });
    
        firebase.database().ref('users/' + this.userId).update({currently_speaking: true});
    
        // Clear this user's current bid.
        let userDisRef = firebase.database().ref('users/' + this.userId + '/current_discussion');
        userDisRef.update({bid: 0, current_price: this.bid});
        const bidRef = firebase.database().ref('rooms/' + this.room.key + '/current_bids/' + this.userId);
        bidRef.set(null);
      }
    });


    // subtract endowment here?
  }

  makeBid(event) {
    const bidHistoryRef = firebase.database().ref('rooms/' + this.room.key + '/bid_history');
    const newBidEvent = bidHistoryRef.push();
    newBidEvent.set({user: this.user.key, amount: this.bid, ts: (new Date).getTime()});

    const currentDiscussionRef = firebase.database().ref('users/' + this.userId + '/current_discussion');
    // const newBidEventForUser = firebase.database().ref('users/' + this.userId + '/current_discussion/bid_history').push();
    currentDiscussionRef.update({bid: this.bid});

    const bidRef = firebase.database().ref('rooms/' + this.room.key + '/current_bids');
    let bid = {amount: this.bid};
    bidRef.child(this.userId).set(bid);
    if (this.status == 'first_round') {
      this.kickOffSpeaking();
    }
    else if (this.room.status == 'general') {
        if (this.top_bid < this.bid) {
          this.roomRef.update({top_bid: this.bid});
          // currentDiscussionRef.update({num_high_bids: newHighBids});
      }
    }

  }

  // This user has finished speaking.
  finishSpeaking(e) {
    console.log("finishSpeaking invoked");
    firebase.database().ref('users/').orderByKey().equalTo(this.userId).on('value', (resp: any) => {
      let user = snapshotToArray(resp)[0];
      if (e == null || (e.action == 'done' && this.current_speaker == this.userId && user.currently_speaking)) {
        console.log("this user finished speaking");
        let now = (new Date).getTime();
        let timeLeft = Math.max((this.room.end_time - now) / 1000, 0);
        // console.log("finished speaking: " + timeLeft + "s left");

        const userRef = firebase.database().ref('users/' + this.userId);
        const oldEndowment = user.endowment;
        console.log("old endow: " + oldEndowment);
        console.log("topbid " + this.top_bid);
        console.log("new endow: " + this.top_bid * (this.SPEAKING_MINS * 60 - timeLeft));
        // userRef.update({endowment: 0, currently_speaking: false});
        userRef.update({currently_speaking: false});
        // userRef.update({endowment: oldEndowment - this.user.current_discussion.current_price * (this.SPEAKING_MINS - timeLeft)});

        // firebase.database().ref('users/' + this.userId + '/current_discussion').update({current_price: null});

        // let newSpeak = firebase.database().ref('users/' + this.userId + '/current_discussion/speaking_history').push();
        // newSpeak.set({start: this.room.end_time - (this.SPEAKING_MINS * 60000), end: now});
        this.roomRef.update({current_speaker: "no one"});
      }
      firebase.database().ref('rooms/').orderByChild('roomname').equalTo(this.roomname).on('value', (resp: any) => {
        this.room = snapshotToArray(resp)[0];
        const roomRef = firebase.database().ref('rooms/' + this.room.key);

        if (this.top_bid == 0) {
        //   this.resetAuction(true);
          this.roomRef.update({status: 'first_round'});
          return;
        }
        const top_bidder = this.all_bids[0];
        if (top_bidder == this.userId) {
          this.kickOffSpeaking(); 
        }

      });

      // reset the auction
      this.top_bid = 0;
    
    });
  }
  

}

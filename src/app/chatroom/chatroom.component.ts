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

interface Bid {
  amount: number;
}

interface Speak {
  start: number;
  end: number;
  spent: number;
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
  bid = 0; bid_position = -1;
  top_bidder = "no one"; current_speaker = "no one"
  roomRef = null; user = null;
  show_mat_card = false; show_global_stats = false; no_stats = false;
  userStats = {timeSpoken: 0, spent: 0, numBids: 0};
  globalStats = {avgTS: 0, avgBids: 0, numBids: 0};

  // default value
  room = {max_speaking_mins: 2, status: 'closed', end_time: -1,
          current_speaker: "no one", key: '000', current_bids: []};
  
  displayedColumns: string[] = ['name', 'amount'];

  all_bids = [];

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

    firebase.database().ref('users/').orderByChild('nickname').equalTo(this.nickname).on('value', (resp: any) => {
      this.user = snapshotToArray(resp)[0];
      if (this.user !== undefined && this.user != null) {
        this.endowment = this.user.endowment;
        this.userId = this.user.key;
      }
    });
    
    firebase.database().ref('rooms/').orderByChild('roomname').equalTo(this.roomname).on('value', (resp: any) => {
      this.room = snapshotToArray(resp)[0];
      this.status = this.room.status;

      if (this.status == 'closed') { 
        if (this.user.type == 'admin') {
          this.displayGlobalStats();
        }
        else this.displayUserStats();
      }
      else {
        this.show_mat_card = false; this.show_global_stats = false;
      }

      if (this.room.end_time == null) {
        this.cd_time = null;
      }
      else {
        this.cd_time = (this.room.end_time - (new Date).getTime()) / 1000;
      }
      this.current_speaker = this.room.current_speaker;
      if (this.roomRef == null) this.roomRef = firebase.database().ref('rooms/' + this.room.key);
      this.current_speaker_nickname = this.userId2Nickname.get(this.current_speaker);

      firebase.database().ref('rooms/' + this.room.key + '/current_bids').orderByChild('amount').on('value', (resp: any) => {
        this.all_bids = snapshotToArray(resp).reverse();
        if (this.user.nickname != 'admin' && this.user.bid > 0) {
          let i = 0;
          for (; i < this.all_bids.length; i++) {
            if (this.all_bids[i].key == this.user.key) break;
          }
          this.bid_position = i + 1;
        }
      });

      this.print("current_speaker: " + this.current_speaker);
      this.print("current_speaker_nickname " + this.current_speaker_nickname);
      this.print("room updated:" + this.status + ", " + this.current_speaker + ", " + this.cd_time);

      this.ref.detectChanges();

      if (this.cd_time < 0) {
        this.resetAuction(null);
      }
    });
  }

  resetAuction(first_round) {
    let changes = {current_speaker: "no one", end_time: null, };
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

  // Display this user's stats at the end of the round.
  displayUserStats() {
    firebase.database().ref('users/' + this.user.key).once('value', (resp: any) => {
      const userInfo = resp.val();
      let bh = {};
      if ('bid_history' in userInfo.current_discussion) {
        bh = userInfo.current_discussion.bid_history;
      }
      let bidSum = 0; let bidLen = 0;

      let x: Bid;
      for (let [key, x] of Object.entries(bh)) {
        let y = x as Bid;
        bidSum += y.amount;
        bidLen += 1;
      }
      this.userStats['numBids'] = bidLen;
      this.userStats['avgBid'] = bidSum / bidLen;

      let ts = 0; let speakLen = 0;
      let spent = 0;
      let sh = {};
      if ('speaking_history' in userInfo.current_discussion) {
        sh = userInfo.current_discussion.speaking_history;
      }
      for (let [key, x] of Object.entries(sh)) {
        let y = x as Speak;
        ts += (y.end - y.start) / 1000;
        spent += y.spent;
        speakLen += 1;
      }
      this.userStats['timeSpoken'] = ts;
      this.userStats['avgTS'] = ts / speakLen;  
      this.userStats['spent'] = spent;
      
      this.show_mat_card = true;
    });
    this.displayGlobalStats();
  }

  displayGlobalStats() {
    firebase.database().ref('users/').once('value', (resp: any) => {
      let users = snapshotToArray(resp);
      let bidSum = 0; let userLen = 0;
      let ts = 0;
      for (let user of users) {
        if (user.nickname != 'admin' && 'current_discussion' in user) {
          userLen += 1;
          let bh = {};
          if ('bid_history' in user.current_discussion) {
            bh = user.current_discussion.bid_history;
          }
    
          for (let [key, x] of Object.entries(bh)) {
            let y = x as Bid;
            bidSum += y.amount;
          }
    
          let sh = {};
          if ('speaking_history' in user.current_discussion) {
            sh = user.current_discussion.speaking_history;
          }
          for (let [key, x] of Object.entries(sh)) {
            let y = x as Speak;
            ts += (y.end - y.start) / 1000;
          }
        }
      }
      this.globalStats['avgBid'] = bidSum / userLen;
      this.globalStats['avgTS'] = ts / userLen;  
      this.show_global_stats = true;
    });
  }

  deleteBidHistory() {
    this.roomRef.update({bid_history: null});
    this.roomRef.update({current_bids: null});
  }

  onFormSubmit(form: any) {
    this.roomRef.update(form);
  }

  topUp(form: any) {
    firebase.database().ref('users/').orderByKey().once('value', (resp: any) => {
      for (let user of snapshotToArray(resp)) {
        if (user.nickname != 'admin') {
          let userRef = firebase.database().ref('users/' + user.key);
          userRef.update({endowment: parseInt(user.endowment) + parseInt(form['amount'])});

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

      firebase.database().ref('users/').once('value', (resp: any) => {
        let users = snapshotToArray(resp);
        let bidSum = 0; let userLen = 0;
        let ts = 0;
        for (let user of users) {
          if (user.nickname != 'admin' && 'current_discussion' in user) {
            let userCD = user.current_discussion;
            const archive = firebase.database().ref('users/' + user.key + '/discussion_history').push();
            archive.set(userCD);

            firebase.database().ref('users/' + user.key + '/current_discussion').set({bid: 0});

          }
        }
      });
    }
  }

  createCDs() {
    for (let user of this.users) {
      firebase.database().ref('users/' + user.key + '/current_discussion').set({bid: 0});
    }
  }

  endDiscussion() {
    if (this.room !== null) {
      const roomRef = firebase.database().ref('rooms/' + this.room.key);
      roomRef.update({status: 'closed'});
    }
  }

  // User userId starts speaking.
  kickOffSpeaking(userId) {
    
    firebase.database().ref('users/' + userId).once('value', (resp: any) => {
      if (this.room.current_speaker != userId) {
        let now = (new Date).getTime();
        // Clear this user's current bid.
        let userDisRef = firebase.database().ref('users/' + userId + '/current_discussion');
        let udrUpdates = {bid: 0, started_speaking: now};
        if (this.room.status == 'first_round') {
          udrUpdates['prev_bid'] = 0;
        }
        else {
          udrUpdates['prev_bid'] = this.user.current_discussion.bid;
        }

        // Clear this user's current bid in the room's current_bids.
        this.roomRef.update({status: 'general', 
          current_speaker: userId,
          end_time: now + this.room.max_speaking_mins * 60000,
        });
        const bidRef = firebase.database().ref('rooms/' + this.room.key + '/current_bids/' + userId);
        this.print("user's bidRef: " + 'rooms/' + this.room.key + '/current_bids/' + userId);
        bidRef.remove();
        userDisRef.update(udrUpdates);

        this.ref.detectChanges();
      }
    });
    
  }

  print(s) {
    if (this.DEBUG) console.log(s);
  }

  makeBid() {
    if (this.bid > 0) {
      const bidHistoryRef = firebase.database().ref('rooms/' + this.room.key + '/bid_history');
      const newBidEvent = bidHistoryRef.push();
      newBidEvent.set({user: this.user.key, amount: this.bid, ts: (new Date).getTime()});

      const currentDiscussionRef = firebase.database().ref('users/' + this.userId + '/current_discussion');
      firebase.database().ref('users/' + this.userId + '/current_discussion/bid_history').child(newBidEvent.key).set({amount: this.bid});
      currentDiscussionRef.update({bid: this.bid});

      if (this.status == 'first_round') {
        this.kickOffSpeaking(this.userId);
        return;
      }

      const bidRef = firebase.database().ref('rooms/' + this.room.key + '/current_bids');
      let bid = {amount: this.bid};
      bidRef.child(this.userId).set(bid);
    }

  }

  // This user has finished speaking.
  finishSpeaking(e) {
    if (e == null || (e.action == 'done' && this.current_speaker == this.userId)) {
      this.roomRef.update({current_speaker: "no one"});
      let now = (new Date).getTime();
      let timeLeft = Math.max((this.room.end_time - now) / 1000, 0);

      let asdf = this;
      firebase.database().ref('users/').orderByKey().equalTo(this.userId).once('value').then(function(resp) {
        const userRef = firebase.database().ref('users/' + asdf.userId);
        let user = snapshotToArray(resp)[0];
        const oldEndowment = user.endowment;
        let spent = Math.ceil((asdf.room.max_speaking_mins * 60 - timeLeft) / 60 * asdf.user.current_discussion.prev_bid);
        userRef.update({endowment: oldEndowment - spent});

        const newSpeak = firebase.database().ref('users/' + asdf.userId + '/current_discussion/speaking_history').push();
        newSpeak.set({start: user.current_discussion.started_speaking, end: now, spent: spent});
      });

      firebase.database().ref('rooms/').orderByChild('roomname').equalTo(this.roomname).once('value', (resp: any) => {
        this.room = snapshotToArray(resp)[0];
        const roomRef = firebase.database().ref('rooms/' + this.room.key);

        if (this.all_bids.length == 0) {
          this.resetAuction(true);
          return;
        }
        const top_bidder = this.all_bids[0];
        console.log(top_bidder);
        this.kickOffSpeaking(top_bidder.key); 

      });
    }
  }

}

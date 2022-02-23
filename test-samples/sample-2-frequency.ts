import wordToNum from 'word-to-numbers';

interface Freq {
  multiplier: number[]
  every: number[]
  at: number[]
  named?: string[]
}

/* Sophisticated parser from a frequency string (ex: annually, twice a year) to an NCRONTAB expression */
export default class Frequency {

  constructor(private raw: string) {}

  private lower = this.raw.toLowerCase();
  //Replace non-alphanumeric characters with '';
  private args = this.lower.replace(/[^a-zA-Z0-9\s:]+/g, '').split(/\s+/);

  static units = ['second', 'minute', 'hour', 'day', 'month', 'day-of-the-week'];
  static otherUnits: {[key: string]: number }[] = [{}, {}, {},
    { week: 7, fortnight: 14 },
    { quarter: 3, 'half-year': 6, annual: 12, year: 12 }
  ];
  static days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  static shortDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  static multiplicative = [, 'once', 'twice', 'thrice'];
  static shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  static timeDict = {
    midnight: '00:00',
    noon: '12:00',
    morning: '06:00',
    afternoon: '2:00',
    evening: '18:00',
    night: '22:00'
  };

  // Return the indexes of the word 'once' in the args array
  public oncePos: number[] = (() => {
    let oncePos = [];
    for (let i = 0; i < this.args.length; i++) {
      if (this.args[i] === 'once') {
        oncePos.push(i);
      }
    }
    return oncePos;
  })();

  // Look for the word 'every' in the string
  private _everyPos?: number[];
  public get everyPos(): number[] {
    if (this._everyPos) return this._everyPos;

    let everyPos = [];
    for (let i = 0; i < this.args.length; i++) {
      
      let curr = this.args[i];
      
      // If the word ends with 'ly' and the substring without 'ly' is in the units or days array, return the position of the word
      if (curr.endsWith('ly')) {
        let shorter = curr.substring(0, curr.length - 2);
        if (Frequency.units.includes(shorter)
          || Frequency.otherUnits.map(f => Object.keys(f)).flat().includes(shorter)
          || Frequency.days.includes(shorter)
          || Frequency.shortDays.includes(shorter)
        ) {
          everyPos.push(i);
        }
      }

      // If the word 'every' is in the string, return the position of the word
      if (curr === 'every') {
        everyPos.push(i);
      }

    }
    return everyPos;
  }

  // Look for every parseable number in the string
  private _numberPos?: number[];
  public get numberPos(): number[] {
    if (this._numberPos) return this._numberPos;
    let numberPos = [];
    for (let i = 0; i < this.args.length; i++) {
      let curr = this.args[i];
      
      if (curr === 'at') {
        numberPos.push(i);
      } else
      if (!isNaN(wordToNum(curr))) {
        numberPos.push(i);
      } else
      if (/(\d+):(\d+)(?::(\d+))?/.test(curr)) {
        numberPos.push(i);
      }
      // If the sig is a multiplicative, set the cachedNumber to the index of the multiplicative
      if (Frequency.multiplicative.includes(curr)) {
        numberPos.push(i);
      }
    }
    return this._numberPos = numberPos;
  }

  // Returns the most significant arg position in the word, which likely contains an iterator, after which we should look for units
  public get sigPos(): number[] {
    return [
      ...this.oncePos,
      ...this.everyPos,
      ...this.numberPos
    ].sort((a, b) => a - b);
  }

  // Set the freqs from the current instance's multiplier and every values
  private setFreqs(freqs: Freq[], i: number): Freq[] {
    let m = this.multiplier || 1;
    let e = this.every || 1;
    if (!freqs[i]) freqs[i] = { at: [], multiplier: [], every: [] };
    if (!freqs[i].multiplier.includes(m)) freqs[i].multiplier.push(m);
    if (!freqs[i].every.includes(e)) freqs[i].every.push(e);
    this.multiplier = 0;
    this.every = 0;
    return freqs;
  }

  private parseNamedDays(freqs: Freq[], sig: string): Freq[] {
    if (!sig) return freqs;
    let dayArr = freqs[5]?.named || [];

    if (sig.includes('weekday')) {
      dayArr = Frequency.shortDays.slice(1, 6);
    } else
    if (sig.includes('weekend')) {
      dayArr = [Frequency.shortDays[0], Frequency.shortDays[5]];
    } else {
      for (let i = 0; i < Frequency.days.length; i++) {
        let d = Frequency.days[i];
        if (sig.includes(d) && !dayArr.includes(d)) {
          dayArr.push(Frequency.shortDays[i]);
        }
      }
    }
    if (!dayArr.length) return freqs;
    if (!freqs[5]) freqs[5] = { multiplier: [], every: [], at: [] };
    freqs[5].named = dayArr;

    return freqs;
  }

  private parseNamedMonths(freqs: Freq[], sig: string): Freq[] {
    if (!sig) return freqs;
    let monthArr = freqs[4]?.named || [];
    for (let m of Frequency.shortMonths) {
      if (sig.includes(m) && !monthArr.includes(m)) {
        monthArr.push(m);
      }
    }
    if (!monthArr.length) return freqs;
    if (!freqs[4]) freqs[4] = { multiplier: [], every: [], at: [] };
    freqs[4].named = monthArr;
    return freqs;
  }

  // Parse the string into h/m/d and add it to the freq object
  private parseTime(freqs: Freq[], sig: string, nextSig: string): Freq[] {
    if (!sig) return freqs;
    let time: string = sig;

    // Match the sig against the timeDict
    for (let [k, v] of Object.entries(Frequency.timeDict)) {
      if (sig === k) {
        time = v;
        break;
      }
    }
    let matches = time.match(/(\d+):(\d+)(?::(\d+))?/);
    if (matches) {
      for (let i = 1; i < matches.length; i++) { //[h, m, s]
        let v = parseInt(matches[i]);
        if (isNaN(v)) continue;
        if (nextSig === 'pm') v += 12;
        let j = 3 - i;
        if (!freqs[j]) freqs[j] = { at: [], multiplier: [], every: [] };
        if (!freqs[j].at) freqs[j].at = [];
        if (!freqs[j].at.includes(v)) freqs[j].at.push(v);
      }
    }
    return freqs;
  }

  private multiplier: number = 0;
  private every: number = 0;
  
  // Iterate over the args from each sigPos and look for unit words. Place the frequency of that unit in an array
  //private _unitFreqs?: Freq[]; 
  public get unitFreqs(): Freq[] {
    //if (this._unitFreqs) return this._unitFreqs;
    let freqs = new Array(Frequency.units.length) as Freq[];

    // For every sigPos, get the corresponding arg
    for (let j = 0; j < this.sigPos.length; j++) {

      let limit = (this.sigPos[j + 1] || this.args.length);
      // But if you hit the next sigPos, stop
      for (let n = this.sigPos[j]; n < limit; n++) {
        let sig = this.args[n];

        /* Skip known contributing words */

        if (this.isFiller(sig)) {
          continue;
        }
        if (sig === 'every') {
          continue;
        }

        /* Parse time first */
        if (this.args[n]) {
          let oldFreqs = freqs.slice(0);
          freqs = this.parseTime(freqs, this.args[n], this.args[n + 1]);
          freqs = this.parseNamedDays(freqs, this.args[n]);
          freqs = this.parseNamedMonths(freqs, this.args[n]);
          if (JSON.stringify(oldFreqs) !== JSON.stringify(freqs)) {
            continue;
          }
        }

        /* Get multipliers */
        if (Frequency.multiplicative.includes(sig)) {
          this.multiplier = Frequency.multiplicative.indexOf(sig);
          continue;
        }

        let convertedNum = wordToNum(sig);
        if (!isNaN(convertedNum) && this.args[n + 1] && this.args[n + 1] === 'times') {
          this.multiplier = convertedNum;
          continue;
        }

        /* Get everys */
        
        if (!isNaN(convertedNum)) {
          if (!this.every) this.every = 1;
          this.every *= convertedNum;
          continue;
        }

        if (sig === 'other') {
          if (!this.every) this.every = 1;
          this.every *= 2;
          continue;
        }

        for (let unit of Frequency.otherUnits) {
          if (unit) {
            for (let key of Object.keys(unit)) {
              if (sig.includes(key)) {
                if (!this.every) this.every = 1;
                this.every *= unit[key];
              }
            }
          }
        }

        /* Set freqs */

        for (let i = 0; i < Frequency.otherUnits.length; i++) {
          let unit = Frequency.otherUnits[i];
          if (unit && Object.keys(unit).some(key => sig.includes(key))) {
            freqs = this.setFreqs(freqs, i);
          }
        }

        // If the sig is a unit, add it to the freqs array
        for (let i = 0; i < Frequency.units.length; i++) {
          let unit = Frequency.units[i];
          if (unit && sig.includes(unit)) {
            freqs = this.setFreqs(freqs, i);
          }
        }

      }
    }
    return freqs;//this._unitFreqs = freqs;
  }

  private isFiller(word: string): boolean {
    // If the word doesn't contain any alphanumeric characters, it's a filler
    if (!/\w/.test(word)) return true;

    if (word === 'a') return true;
    if (word === 'an') return true;
    if (word === 'the') return true;
    if (word === 'in') return true;
    if (word === 'times') return true;
    return false;
    
  }

  // Go through each arg and see if we can understand what kind of word it is. Log the ones we can't understand
  public accountForArgs(): string[] {
    let types = new Array(this.args.length);
    for (let i = 0; i < this.args.length; i++) {
      if (this.isFiller(this.args[i])) {
        types.push('filler');
      } else
      if (this.everyPos.includes(i)) {
        types.push('every');
      }
    }
    let bad = new Array(this.args.length);
    for (let i = 0; i < this.args.length; i++) {
      if (types[i] === undefined) {
        bad[i] = this.args[i];
      }
    }
    return bad;
  }

  // Convert the number array given by the Freq object into a string
  private cnaFreq(arr: number[]): string {
    if (!arr.length) {
      return '*';
    } else
    if (arr.length > 1) {
      return arr.join(',');
    } else
    if (arr[0] === 1) {
      return '*';
    } else
    if (typeof arr[0] === 'number') {
      return arr[0].toString();
    } else {
      return '*';
    }
  }

  toNcrontab(): string {
    let arr: string[] = new Array(Frequency.units.length);
    for (let i = 0; i < this.unitFreqs.length; i++) {
      let f = this.unitFreqs[i];
      if (!f) continue;
      if (f.at.length) {
        arr[i] = f.at.join(',').toString();
      } else
      if (f.named && f.named.length) {
        arr[i] = f.named.join(',').toString();
      } else {
        let str = `${this.cnaFreq(f.multiplier)}/${this.cnaFreq(f.every)}`;
        if (str === '*/*') str = '*';
        arr[i] = str;
      }
    }
    let min = arr.findIndex(n => n);
    for (let i = 0; i < arr.length; i++) {

      // Populate the non-repeated units with 0s
      if (i < min) {
        arr[i] = '0';
      } else
      // Populate the repeated units with *s
      if (!arr[i]) {
        arr[i] = '*';
      }

    }
    return arr.join(' ');
  }

  toString(): string {
    return this.toNcrontab();
  }

  // TODO: 0 0 9-17 * * * ===	once every hour from 9 AM to 5 PM

}

export function foo(v: string): string {
  return 'bar';
}
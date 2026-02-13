import { Component } from "./component";

export class Text extends Component{
  constructor(public size:number, public isBold:boolean, public isItalic:boolean,){
    super()
  }
}
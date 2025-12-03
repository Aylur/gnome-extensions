import Eval from "./Eval"

export default class EvalExtension {
  eval?: Eval

  enable() {
    this.eval = new Eval()
    this.eval.serve()
  }

  disable() {
    this.eval?.stop()
    delete this.eval
  }
}

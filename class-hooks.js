const addEffects = (self, config) => {
  const effects = config.map(([fn, fdep]) => ({
    fn,
    fdep,
    inst: null,
    args: [],
  }))
  const patch = (ctx, key, fn) => {
    const their = ctx[key].bind(ctx)
    const our = their
      ? (...args) => {
          fn(...args)
          their(...args)
        }
      : fn
    ctx[key] = our
  }
  const run = stage => {
    const forceRun = stage !== 1
    const { props, state } = self

    effects.forEach(ef => {
      const nextArgs = ef.fdep(props, state).map((x, i) => [ef.args[i], x])
      if (stage > 0 && ef.args.length !== nextArgs.length) {
        throw new Error('deps lengths mismatch')
      }
      ef.args = nextArgs

      const runFn = forceRun || ef.args.some(([p, n]) => !Object.is(p, n))

      if (runFn) {
        typeof ef.inst === 'function' && ef.inst()
        if (stage !== 2) {
          ef.inst = ef.fn(ef.args)
        }
      }
    })
  }

  patch(self, 'componentDidMount', () => run(0))
  patch(self, 'componentDidUpdate', () => run(1))
  patch(self, 'componentWillUnmount', () => run(2))
}

export default class Test extends React.Component {
  constructor(...args) {
    super(...args)
    this.state = {}

    const ef1 = () => console.log('ef1')

    addEffects(this, [
      [
        ([[prevId, id], [prevCount, count]]) => ef1(),
        (p, s) => [p.id, p.count],
      ],
    ])
  }

  componentDidMount() {
    console.log('enter')
    this.setState({ one: 1 })
  }

  componentDidUpdate(...args) {
    console.log('did update', ...args)

    if (this.state.one === 1) {
      this.setState({ one: 2 })
    }
  }

  componentWillUnmount() {
    console.log('dispose')
  }

  afterRender(prevProps, prevState) {}

  render() {
    console.log('render', this.state)
    return null
  }
}

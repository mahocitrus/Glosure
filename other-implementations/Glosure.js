function reader(codeStr) {
    let len = codeStr.length
    let pos = 0
    let stack = [[]]
    while (pos < len) {
        let c = codeStr[pos]
        ++pos
        if (' ,\n\t\r'.indexOf(c) !== -1) {
            //nothing
        } else if (c === '(') {
            stack.push([])
        } else if (c === ')') {
            if (stack.length < 2) throw new SyntaxError('Glosure: Error: Unbalanced parenthesis.');
            let top = stack.pop()
            stack[stack.length - 1].push(top)
        } else if ('0123456789.'.indexOf(c) !== -1 || (c === '-' && pos < len && '0123456789.'.indexOf(codeStr[pos]) !== -1)) {
            let start = pos - 1
            while (pos < len && '0123456789.'.indexOf(codeStr[pos]) !== -1) ++pos
            stack[stack.length - 1].push(Number(codeStr.slice(start, pos)))
        } else if (c === "'") {
            let token = ["'"]
            while (pos < len && codeStr[pos] !== "'") {
                if (pos < len - 1 && codeStr[pos] === "\\") {
                    ++pos
                    switch (codeStr[pos]) {
                        case 't':
                            token.push('\t')
                            break
                        case 'n':
                            token.push('\n')
                            break
                        case 'r':
                            token.push('\r')
                            break
                        default:
                            token.push(codeStr[pos])
                    }
                } else {
                    token.push(codeStr[pos])
                }
                ++pos
            }
            if (pos >= len) throw new SyntaxError('Glosure: Error: Unbalanced quotes.')
            token.push("'")
            ++pos
            stack[stack.length - 1].push(token.join(''))
        } else if (c === ';') {
            if (pos < len && codeStr[pos] === '|') {
                ++pos
                while (pos < len - 1) {
                    if (codeStr[pos] === '|' && codeStr[pos + 1] === ';') {
                        pos+=2
                        break
                    }
                    ++pos
                }
            } else {
                while (pos < len && codeStr[pos] !== '\n') ++pos
                if (pos < len && codeStr[pos] === '\n') ++pos
            }
        } else {
            let start = pos - 1
            while (pos < len && " ,.'();\t\n\r".indexOf(codeStr[pos]) === -1) ++pos
            stack[stack.length - 1].push(codeStr.slice(start, pos))
        }
    }
    if (stack.length !== 1) throw new SyntaxError('Glosure: Error: Unbalanced parenthesis.')
    return ['begin', ...stack[0]]
}
class Env {
    constructor(outer) {
        this.__outer = outer
        this.__local = new Map()
        if (outer === null) this.__outest = new Map()
        else this.__outest = outer.__outest
    }
    contains(symbol) {
        return this.__local.has(symbol)
    }
    def(symbol, value) {
        return this.__local.set(symbol, value).get(symbol)
    }
    set(symbol, value) {
        if (this.contains(symbol)) return this.def(symbol, value)
        if (this.__outer) return this.__outer.set(symbol, value)
        throw new ReferenceError(`Glosure: Runtime Error: Unknown symbol '${symbol}'.`)
    }
    get(symbol) {
        if (this.contains(symbol)) return this.__local.get(symbol)
        if (this.__outer) return this.__outer.get(symbol)
        throw new ReferenceError(`Glosure: Runtime Error: Unknown symbol '${symbol}'.`)
    }
}
function evaluate(expr, env) {
    if (!Array.isArray(expr)) {
        if (typeof expr !== 'string') return expr
        if (expr[0] === "'") return expr.slice(1, expr.length - 1)
        return env.get(expr)
    }
    let result = null
    let args = null
    switch (expr[0]) {
    case 'def':
        if (expr.length < 3) throw new SyntaxError('Glosure: Runtime Error: def keyword requires 2 arguments.')
        return env.def(expr[1], evaluate(expr[2], env))
    case '=':
        if (expr.length < 3) throw new SyntaxError('Glosure: Runtime Error: = keyword requires 2 arguments.')
        return env.set(expr[1], evaluate(expr[2], env))
    case 'quote':
        if (expr.length !== 2) throw new SyntaxError('Glosure: Runtime Error: quote keyword requires 2 arguments.')
        return expr[1]
    case 'if':
        if (expr.length < 3) throw new SyntaxError('Glosure: Runtime Error: if keyword requires 2 or 3 arguments.')
        if (evaluate(expr[1], env)) return evaluate(expr[2], env)
        if (expr.length > 3) return evaluate(expr[3], env)
        return null
    case 'loop':
        while (expr.length === 1);
        result = null
        for (let i = 1; i < expr.length; ++i) result = evaluate(expr[i], env)
        while (result) {
            for (let i = 1; i < expr.length; ++i) result = evaluate(expr[i], env)
        }
        return result
    case 'lambda':
        if (expr.length < 3) throw new SyntaxError('Glosure: Runtime Error: lambda keyword requires 2 or more arguments.')
        if (!Array.isArray(expr[1])) throw new SyntaxError('Glosure: Runtime Error: lambda requires a list as params.')
        return new Map([
            ['classID', 'lambda'],
            ['params', expr[1]],
            ['body', expr.slice(2)],
            ['env', env],
        ])
    case 'begin':
        result = null
        for (let i = 1; i < expr.length; ++i) result = evaluate(expr[i], env)
        return result
    case 'exec':
        if (expr.length !== 2) throw new SyntaxError('Glosure: Runtime Error: exec keyword requires 1 argument.')
        return execute(evaluate(expr[1], env), env)
    case 'eval':
        if (expr.length !== 2) throw new SyntaxError('Glosure: Runtime Error: eval keyword requires 1 argument.')
        return evaluate(evaluate(expr[1], env), env)
    case 'glosure':
        if (expr.length < 3) throw new SyntaxError('Glosure: Runtime Error: glosure keyword requires 2 or more arguments.')
        if (!Array.isArray(expr[1])) throw new SyntaxError('Glosure: Runtime Error: glosure requires a list as params.')
        if (expr[1].length > 5) throw new SyntaxError('Glosure: Runtime Error: glosure can only take 5 or less params.')
        return (function() {
            let __eval = evaluate
            let __env = env
            let lambda = new Map([
                ['classID', 'glosure'],
                ['params', expr[1]],
                ['body', expr.slice(2)],
                ['env', env],
            ])
            let glosure0 = () => __eval([lambda], __env)
            let glosure1 = (arg0) => __eval([lambda, arg0], __env)
            let glosure2 = (arg0, arg1) => __eval([lambda, arg0, arg1], __env)
            let glosure3 = (arg0, arg1, arg2) => __eval([lambda, arg0, arg1, arg2], __env)
            let glosure4 = (arg0, arg1, arg2, arg3) => __eval([lambda, arg0, arg1, arg2, arg3], __env)
            let glosure5 = (arg0, arg1, arg2, arg3, arg4) => __eval([lambda, arg0, arg1, arg2, arg3, arg4], __env)
            if (lambda.get('params').length === 0) return glosure0
            if (lambda.get('params').length === 1) return glosure1
            if (lambda.get('params').length === 2) return glosure2
            if (lambda.get('params').length === 3) return glosure3
            if (lambda.get('params').length === 4) return glosure4
            return glosure5
        })()
    case 'dot':
        if (expr.length < 3) throw new SyntaxError('Glosure: Runtime Error: dot keyword requires at least 2 arguments.')
        if (expr.length > 8) throw new SyntaxError(`Glosure: Runtime Error: dot keyword take at most 7 params but received ${(expr.length - 1)} arguments.`)
        args = []
        for (let i = 1; i < expr.length; ++i) args.push(evaluate(expr[i], env))
        let object = args[0]
        let method = args[1]
        args = args.slice(2)
        if (args.length === 0) return object[method]()
        if (args.length === 1) return object[method](args[0])
        if (args.length === 2) return object[method](args[0], args[1])
        if (args.length === 3) return object[method](args[0], args[1], args[2])
        if (args.length === 4) return object[method](args[0], args[1], args[2], args[3])
        return object[method](args[0], args[1], args[2], args[3], args[4])
    case 'array':
        args = []
        for (let i = 1; i < expr.length; ++i) args.push(evaluate(expr[i], env))
        return args
    case 'dict':
        args = []
        for (let i = 1; i < expr.length; ++i) args.push(evaluate(expr[i], env))
        if (args.length & 1) args.push(null)
        let ret = new Map()
        for (let i = 0; i < args.length; i+=2) ret.set(args[i], args[i+1])
        return ret
    case 'context':
        return env.__local
    default:
        let func = evaluate(expr[0], env)
        args = expr.slice(1)
        let evaluatedArgs = []
        if (func instanceof Map && ['lambda', 'glosure'].indexOf(func.get('classID')) !== -1) {
            if (args.length > func.get('params').length) throw new SyntaxError(`Glosure: Runtime Error: calling a ${func.get('classID')} takes at most ${func.get('params').length} params but received ${args.length} arguments.`)
            if (func.get('classID') === 'lambda') {
                for (let i = 0; i < args.length; ++i) evaluatedArgs.push(evaluate(args[i], env))
            } else {
                for (let i = 0; i < args.length; ++i) evaluatedArgs.push(args[i])
            }
            while (evaluatedArgs.length < func.get('params').length) evaluatedArgs.push(null)
            let newEnv = new Env(func.get('env'))
            for (let i = 0; i < func.get('params').length; ++i) newEnv.def(func.get('params')[i], evaluatedArgs[i])
            result = null
            for (let i = 0; i < func.get('body').length; ++i) result = evaluate(func.get('body')[i], newEnv)
            return result
        } else if (typeof func === 'function') {
            if (args.length > 5) throw new SyntaxError(`Glosure: Runtime Error: glosure takes at most 5 params but received ${args.length} arguments.`)
            for (let i = 0; i < args.length; ++i) evaluatedArgs.push(evaluate(args[i], env))
            if (evaluatedArgs.length === 0) return func()
            if (evaluatedArgs.length === 1) return func(evaluatedArgs[0])
            if (evaluatedArgs.length === 2) return func(evaluatedArgs[0], evaluatedArgs[1])
            if (evaluatedArgs.length === 3) return func(evaluatedArgs[0], evaluatedArgs[1], evaluatedArgs[2])
            if (evaluatedArgs.length === 4) return func(evaluatedArgs[0], evaluatedArgs[1], evaluatedArgs[2], evaluatedArgs[3])
            return func(evaluatedArgs[0], evaluatedArgs[1], evaluatedArgs[2], evaluatedArgs[3], evaluatedArgs[4])
        }
        return null
    }
}
function GlobalEnv() {
    let globalEnv = new Env(null)
    globalEnv.def('&', (a, b) => Number(a && b))
    globalEnv.def('|', (a, b) => Number(a || b))
    globalEnv.def('!', (a) => Number(!a))
    globalEnv.def('==', (a, b) => Number(a === b))
    globalEnv.def('!=', (a, b) => Number(a !== b))
    globalEnv.def('>=', (a, b) => Number(a >= b))
    globalEnv.def('<=', (a, b) => Number(a <= b))
    globalEnv.def('>', (a, b) => Number(a > b))
    globalEnv.def('<', (a, b) => Number(a < b))
    globalEnv.def('+', (a, b) => a + b)
    globalEnv.def('-', (a, b) => a - b)
    globalEnv.def('*', (a, b) => a * b)
    globalEnv.def('/', (a, b) => a / b)
    globalEnv.def('^', (a, b) => a ** b)
    globalEnv.def('%', (a, b) => a % b)
    globalEnv.def('isa', (a, b) => {
        return a instanceof b // incorrect practice
    })
    globalEnv.def('at', (a, b) => a[b])
    globalEnv.def('set', (a, b, c) => {
        a[b] = c
        return c
    })
    let general = new Map()
    general.set('print', (str) => console.log(str))
    general.set('program_path', () => '/root/myprogram')
    let miniscriptMethods = new Map()
    miniscriptMethods.set('hasIndex', Array.hasIndex)
    for (const [key, value] of new Map([...general, ...miniscriptMethods])) globalEnv.def(key, value)
    return globalEnv
}
function preprocess(expr, env) {
    if (!env.__outest.has('__macros')) env.__outest.set('__macros', new Map())
    if (!env.__outest.has('__gensymCounter')) env.__outest.set('__gensymCounter', 0)
    let __macros = env.__outest.get('__macros')
    const fmap = (f, expr, env) => {
        expr = [...expr]
        for (let i = 0; i < expr.length; ++i) expr[i] = f(expr[i], env)
        return expr
    }
    const deepreplace = (expr, a, b) => {
        let result = []
        for (let i = 0; i < expr.length; ++i) {
            if (Array.isArray(expr[i])) {
                result.push(deepreplace(expr[i], a, b))
            } else if (expr[i] === a) {
                result.push(b)
            } else {
                result.push(expr[i])
            }
        }
        return result
    }
    const gensym = (env) => env.__outest.set('__gensymCounter', env.__outest.get('__gensymCounter') + 1).get('__gensymCounter')
    const _preprocess = (expr, env) => {
        if (!Array.isArray(expr)) return expr
        if (expr.length === 0) return [...expr]
        let keyword = expr[0]
        if (keyword === 'defmacro') {
            if ((expr.length) !== 5) throw new SyntaxError('Glosure: Preprocessing Error: defmacro keyword requires 4 arguments.')
            let name = expr[1]
            if (typeof name !== 'string') throw new SyntaxError('Glosure: Preprocessing Error: defmacro keyword requires name to be a symbol.')
            let args = expr[2]
            if (!Array.isArray(args)) throw new SyntaxError('Glosure: Preprocessing Error: defmacro keyword requires args to be an s-expression.')
            for (let i = 0; i < args.length; ++i) {
                if (typeof args[i] !== 'string') throw new SyntaxError('Glosure: Preprocessing Error: defmacro keyword requires each macro argument to be a symbol.')
            }
            let syms = expr[3]
            if (!Array.isArray(syms)) throw new SyntaxError('Glosure: Preprocessing Error: defmacro keyword requires macro gensym symbols to be an s-expression.')
            for (let i = 0; i < syms.length; ++i) {
                if (typeof syms[i] !== 'string') throw new SyntaxError('Glosure: Preprocessing Error: defmacro keyword requires each macro gensym symbol to be a symbol.')
            }
            let body = expr[4]
            if ((typeof body !== 'string') && (!Array.isArray(body))) throw new SyntaxError('Glosure: Preprocessing Error: defmacro keyword requires body to be either a symbol or an s-expression.')
            if (Array.isArray(body)) {
                for (let i = 0; i < syms.length; ++i) {
                    body = deepreplace(body, syms[i], gensym(env))
                }
            }
            __macros.set(name, [args, body])
        } else if (__macros.has(keyword)) {
            let macroname = keyword
            let macroargs = __macros.get(macroname)[0]
            let macrobody = __macros.get(macroname)[1]
            let args = expr.slice(1)
            if (macroargs.length === 0) {
                if (args.length === 0) return _preprocess(macroargs, env)
                let expr = [...expr]
                expr[0] = _preprocess(macrobody, env)
                return _preprocess(expr, env)
            } else if (macroargs.length !== args.length) {
                throw new SyntaxError(`Glosure: Preprocessing Error: ${macroname} macro requires ${macroargs.length} arguments.`)
            } else {
                let body = [...macrobody]
                for (let i = 0; i < args.length; ++i) {
                    let macroarg = macroargs[i]
                    let arg = args[i]
                    body = deepreplace(body, macroarg, arg)
                }
                return _preprocess(body, env)
            }
        } else {
            return fmap(_preprocess, expr, env)
        }
    }
    return _preprocess(expr, env)
}
function execute(codeStr, env) {
    return evaluate(preprocess(reader(codeStr), env), env)
}

//Standard Glosure Library
stl = `
;; Standard Glosure Library
(defmacro defun (name arguments body) () (def name (lambda arguments body)))

(defmacro defunction (name arguments body) () (def name (glosure arguments body)))

(defmacro while (condition body) (!result)
    (if condition (begin
        (loop (def !result body) condition)
        !result)))

(defmacro do-while (condition body) (!result) (begin
    (loop (def !result body) condition)
    !result))

(defmacro for (initializer condition iterator body) (!result) ((lambda ()
    initializer
    (if condition (begin
        (loop (def !result body) iterator condition)
        !result)))))

(defmacro foreach (key value collection body) (!keys !idx !len) ((lambda ()
    (def !keys (indexes collection))
    (def !len (len !keys))
    (def !idx 0)
    (if !len (begin
        (loop 
            (def key (at !keys (var++ !idx)))
            (def value (at collection key))
            body
            (< !idx !len))
        value)))))

(defmacro defalias (name keyword) () (defmacro name () () keyword))

(defun // (a b) (floor (/ a b)))

(defmacro swap (a b) (!temp) (begin
    (def !temp a)
    (= a b)
    (= b !temp)))

(defmacro ++ (var) () (= var (+ var 1)))
(defmacro var++ (var) (!temp) (begin
    (def !temp var)
    (= var (+ var 1))
    !temp))

(defmacro -- (var) () (= var (- var 1)))
(defmacro var-- (var) (!temp) (begin
    (def !temp var)
    (= var (- var 1))
    !temp))

(defmacro += (var val) () (= var (+ var val)))
(defmacro -= (var val) () (= var (- var val)))
(defmacro *= (var val) () (= var (* var val)))
(defmacro /= (var val) () (= var (/ var val)))
(defmacro //= (var val) () (= var (// var val)))
(defmacro %= (var val) () (= var (% var val)))
(defmacro ^= (var val) () (= var (^ var val)))

(def params (if (hasIndex globals 'params') (at globals 'params') (array)))

(def script-path (program_path))

;(defun gensym () (exec '(defmacro _ () (sym) (quote sym))(_)')) ;; Unquote is needed to make it any usefull
`

prepareCode = stl + '\n' + `
(for (def i 0) (< i 10) (++ i) (print i))
`
let env = new Env(GlobalEnv())
execute(prepareCode, env)
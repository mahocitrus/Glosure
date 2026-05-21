#!/usr/bin/env python3
# Work-in-progress, not feature complete, a lot of bugs.

import math

class Env:
    def __init__(self, outer):
        self.__outer = outer
        if outer == None:
            self.__outest = self
            self.__macros = {}
            self.__gensymCounter = 0
        else:
            self.__outest = self.__outer.__outest
        self.__local = {}

    def tickCounter(self):
        self.__outest.__gensymCounter+=1
        return self.__outest.__gensymCounter

    def get_macros(self):
        return self.__outest.__macros

    def contains(self, symbol):
        return symbol in self.__local

    def define(self, symbol, value):
        self.__local[symbol] = value
        return value

    def set(self, symbol, value):
        if self.contains(symbol):
            return self.define(symbol, value)
        if self.__outer:
            return self.__outer.set(symbol, value)
        raise ValueError(f"Glosure: Runtime Error: Unknown symbol '{symbol}'.")

    def get(self, symbol):
        if self.contains(symbol):
            return self.__local[symbol]
        if self.__outer:
            return self.__outer.get(symbol)
        raise ValueError(f"Glosure: Runtime Error: Unknown symbol '{symbol}'.")

def reader(codeStr: str):
    stack = [[]]
    length = len(codeStr)
    pos = 0
    while pos < length:
        c = codeStr[pos]
        pos+=1
        if c in ' ,\n\t\r':
            pass
        elif c == '(':
            stack.append([])
        elif c == ')':
            if len(stack) < 2:
                raise SyntaxError("Glosure: Error: Unbalanced parenthesis.")
            top = stack.pop()
            stack[-1].append(top)
        elif c in '0123456789.' or (c == '-' and pos < length - 1 and codeStr[pos] in '0123456789.'):
            start = pos - 1
            while pos < length and codeStr[pos] in '0123456789.':
                pos+=1
            num = codeStr[start:pos]
            if '.' in num:
                num = float(num)
            else:
                num = int(num)
            stack[-1].append(num)
        elif c == "'":
            token = ["'"]
            while pos < length and codeStr[pos] != "'":
                if pos < length - 1 and codeStr[pos] == '\\':
                    pos+=1
                    if codeStr[pos] == 't':
                        token.append('\t')
                    elif codeStr[pos] == 'n':
                        token.append('\n')
                    elif codeStr[pos] == 'r':
                        token.append('\r')
                    else:
                        token.append(codeStr[pos])
                else:
                    token.append(codeStr[pos])
                pos+=1
            if pos >= length:
                raise SyntaxError("Glosure: Error: Unbalanced quotes.")
            token.append("'")
            pos+=1
            stack[-1].append(''.join(token))
        elif c == ';':
            if pos < length and codeStr[pos] == '|':
                pos+=1
                while pos < length - 1:
                    if codeStr[pos] == '|' and codeStr[pos+1] == ';':
                        pos+=2
                        break
                    pos+=1
            else:
                while pos < length and codeStr[pos] != '\n':
                    pos+=1
                if pos < length and codeStr[pos] == '\n':
                    pos+=1
        else:
            start = pos - 1
            while pos < length and not codeStr[pos] in " .,'();\t\n\r":
                pos+=1
            stack[-1].append(codeStr[start:pos])
    if len(stack) != 1:
        raise SyntaxError("Glosure: Error: Unbalanced parenthesis.")
    return ['begin'] + stack[0]

def evaluate(expr, env):
    if not isinstance(expr, list):
        if not isinstance(expr, str):
            return expr
        if expr[0] == "'":
            return expr[1:-1]
        else:
            return env.get(expr)
    if not len(expr):
        return None
    first = expr[0]
    if first == 'def':
        if len(expr) < 3:
            raise SyntaxError('Glosure: Runtime Error: def keyword requires 2 arguments.')
        return env.define(expr[1], evaluate(expr[2], env))
    elif first == '=':
        if len(expr) < 3:
            raise SyntaxError('Glosure: Runtime Error: = keyword requires 2 arguments.')
        return env.set(expr[1], evaluate(expr[2], env))
    elif first == 'quote':
        if len(expr) != 2:
            raise SyntaxError('Glosure: Runtime Error: = keyword requires 2 arguments.')
        return expr[1]
    elif first == 'if':
        if len(expr) < 3:
            raise SyntaxError('Glosure: Runtime Error: if keyword requires 2 or 3 arguments.')
        if evaluate(expr[1], env):
            return evaluate(expr[2], env)
        if len(expr) > 3:
            return evaluate(expr[3], env)
        return None
    elif first == 'loop':
        while len(expr) == 1:
            pass
        result = None
        for stmt in expr[1:]:
            result = evaluate(stmt, env)
        while result:
            for stmt in expr[1:]:
                result = evaluate(stmt, env)
        return result
    elif first == 'lambda':
        if len(expr) < 3:
            raise SyntaxError('Glosure: Runtime Error: lambda keyword requires 2 or more arguments.')
        if not isinstance(expr[1], list):
            raise SyntaxError('Glosure: Runtime Error: lambda requires a list as params.')
        return {
            'classID': 'lambda',
            'params': expr[1],
            'body': expr[2:],
            'env': env,
        }
    elif first == 'begin':
        result = None
        for stmt in expr[1:]:
            result = evaluate(stmt, env)
        return result
    elif first == 'exec':
        if len(expr) != 2:
            raise SyntaxError('Glosure: Runtime Error: exec keyword requires 1 argument.')
        return execute(evaluate(expr[1], env), env)
    elif first == 'eval':
        if len(expr) != 2:
            raise SyntaxError('Glosure: Runtime Error: eval keyword requires 1 argument.')
        return evaluate(evaluate(expr[1], env), env)
    elif first == 'glosure':
        if len(expr) < 3:
            raise SyntaxError('Glosure: Runtime Error: glosure keyword requires 2 or more arguments.')
        if not isinstance(expr[1], list):
            raise SyntaxError('Glosure: Runtime Error: glosure requires a list as params.')
        if len(expr) > 5:
            raise SyntaxError('Glosure: Runtime Error: glosure can only take 5 or less params.')
        def buildGlosure():
            __eval = evaluate
            __env = env
            glosure = {
                'classID': 'glosure',
                'params': expr[1],
                'body': expr[2:],
                'env': env,
            }
            def glosure0():
                return __eval([glosure], __env)
            def glosure1(arg0):
                return __eval([glosure, arg0], __env)
            def glosure2(arg0, arg1):
                return __eval([glosure, arg0, arg1], __env)
            def glosure3(arg0, arg1, arg2):
                return __eval([glosure, arg0, arg1, arg2], __env)
            def glosure4(arg0, arg1, arg2, arg3):
                return __eval([glosure, arg0, arg1, arg2, arg3], __env)
            def glosure5(arg0, arg1, arg2, arg3, arg4):
                return __eval([glosure, arg0, arg1, arg2, arg3, arg4], __env)
            if len(glosure['params']) == 0:
                return glosure0
            if len(glosure['params']) == 1:
                return glosure1
            if len(glosure['params']) == 2:
                return glosure2
            if len(glosure['params']) == 3:
                return glosure3
            if len(glosure['params']) == 4:
                return glosure4
            return glosure5
        return buildGlosure()
    elif first == 'dot':
        if len(expr) < 3:
            raise SyntaxError('Glosure: Runtime Error: dot keyword requires at least 2 arguments.')
        if len(expr) > 7:
            raise SyntaxError(f'Glosure: Runtime Error: dot keyword take at most 6 params but received {(len(expr) - 1)} arguments.')
        args = []
        for arg in expr[1:]:
            args.append(evaluate(arg, env))
        obj = args[0]
        method = obj[args[1]]
        args = args[2:]
        if len(args) == 0:
            return method(obj)
        if len(args) == 1:
            return method(obj, args[0])
        if len(args) == 2:
            return method(obj, args[0], args[1])
        if len(args) == 3:
            return method(obj, args[0], args[1], args[2])
        if len(args) == 4:
            return method(obj, args[0], args[1], args[2], args[3])
        return method(obj, args[0], args[1], args[2], args[3], args[4])
    elif first == 'array':
        args = []
        for arg in expr[1:]:
            args.append(evaluate(arg, env))
        return args
    elif first == 'dict':
        args = []
        for arg in expr[1:]:
            args.append(evaluate(arg, env))
        if len(args) & 1:
            args.append(None)
        ret = {}
        for i in range(0, len(args), 2):
            ret[args[1]] = args[i+1]
        return ret
    elif first == 'context':
        return env.__local
    else:
        func = evaluate(first, env)
        args = expr[1:]
        evaluatedArgs = []
        if isinstance(func, dict) and 'classID' in func and (func['classID'] == 'lambda' or func['classID'] == 'glosure'):
            if len(args) > len(func['params']):
                raise SyntaxError(f'Glosure: Runtime Error: calling a {func['classID']} takes at most {len(func['params'])} params but received {len(args)} arguments.')
            for arg in args:
                if func['classID'] == 'lambda':
                    evaluatedArgs.append(evaluate(arg, env))
                else:
                    evaluatedArgs.append(arg)
            while len(evaluatedArgs) < len(func['params']):
                evaluatedArgs.append(None)
            newEnv = Env(func['env'])
            for i in range(len(func['params'])):
                newEnv.define(func['params'][i], evaluatedArgs[i])
            result = None
            for bodyExpr in func['body']:
                result = evaluate(bodyExpr, env)
            return result
        elif callable(func):
            for arg in args:
                evaluatedArgs.append(evaluate(arg, env))
            if len(evaluatedArgs) > 5:
                raise SyntaxError(f'Glosure: Runtime Error: glosure takes at most 5 params but received {len(evaluatedArgs)} arguments.')
            if len(evaluatedArgs) == 0:
                return func()
            if len(evaluatedArgs) == 1:
                return func(evaluatedArgs[0])
            if len(evaluatedArgs) == 2:
                return func(evaluatedArgs[0], evaluatedArgs[1])
            if len(evaluatedArgs) == 3:
                return func(evaluatedArgs[0], evaluatedArgs[1], evaluatedArgs[2])
            if len(evaluatedArgs) == 4:
                return func(evaluatedArgs[0], evaluatedArgs[1], evaluatedArgs[2], evaluatedArgs[3])
            return func(evaluatedArgs[0], evaluatedArgs[1], evaluatedArgs[2], evaluatedArgs[3], evaluatedArgs[4])
            
def GlobalEnv():
    globalEnv = Env(None)
    globalEnv.define('&', lambda a, b: a and b)
    globalEnv.define('|', lambda a, b: a or b)
    globalEnv.define('!', lambda a: not a)
    globalEnv.define('==', lambda a, b: a == b)
    globalEnv.define('!=', lambda a, b: a != b)
    globalEnv.define('>=', lambda a, b: a >= b)
    globalEnv.define('<=', lambda a, b: a <= b)
    globalEnv.define('>', lambda a, b: a > b)
    globalEnv.define('<', lambda a, b: a < b)
    globalEnv.define('+', lambda a, b: a + b)
    globalEnv.define('-', lambda a, b: a - b)
    globalEnv.define('*', lambda a, b: a * b)
    globalEnv.define('/', lambda a, b: a / b)
    globalEnv.define('^', lambda a, b: pow(a, b))
    globalEnv.define('%', lambda a, b: a % b)
    globalEnv.define('isa', lambda a, b: isinstance(a, b))
    globalEnv.define('at', lambda a, b: a[b])
    def setitem(a, b, c):
        a[b] = c
        return c
    globalEnv.define('set', setitem)

    def typeof(obj):
        if isinstance(obj, int) or isinstance(obj, float):
            return 'number'
        if isinstance(obj, str):
            return 'string'
        if isinstance(obj, list):
            return 'list'
        if isinstance(obj, dict):
            if 'classID' in obj:
                return obj['classID']
            return 'map'
        if obj is None:
            return 'null'
        if callable(obj):
            return 'function'
    def include_lib(lib_path):
        return None
    def user_input(msg='', is_pass=False, any_key=False, history=False):
        return input(msg)
    general = { # TODO, emulate all grey hack api in python
        'print': print,
        'user_input': user_input,
        'globals': lambda: {},
        'program_path': lambda: '/root/myprogram',
        'typeof': typeof,
        'include_lib': include_lib,
        'true': 1,
        'false': 0,
        'null': None,
    }

    def hasIndex(obj, idx):
        if isinstance(obj, dict):
            return idx in obj
        if isinstance(idx, float) or isinstance(idx, int):
            return idx >= 0 and idx <= len(obj)
        return None
    def indexes(obj):
        if isinstance(obj, dict):
            return [key for _, key in enumerate(obj)]
        return list(range(len(obj)))
    def floor(n):
        return int(math.floor(n))
    miniscriptMethods = { # TODO, emulate all miniscript methods in python
        'hasIndex': hasIndex,
        'char': chr,
        'len': len,
        'indexes': indexes,
        'floor': floor
    }

    general.update(miniscriptMethods)
    for _, k in enumerate(general):
        globalEnv.define(k, general[k])
    return globalEnv

def preprocess(expr, env):
    __macros = env.get_macros()
    def fmap(f, expr, env):
        expr = expr[0:]
        i = 0
        while i < len(expr):
            expr[i] = f(expr[i], env)
            i+=1
        return expr
    def deepreplace(expr, a, b):
        result = []
        for e in expr:
            if isinstance(e, list):
                result.append(deepreplace(e, a, b))
            elif e == a:
                result.append(b)
            else:
                result.append(e)
        return result
    def gensym(env):
        return f'#:G{env.tickCounter()}'
    def _preprocess(expr, env):
        if not isinstance(expr, list):
            return expr
        if len(expr) == 0:
            return expr[0:]
        keyword = expr[0]
        if not isinstance(keyword, str):
            return fmap(_preprocess, expr, env)
        if keyword == 'defmacro':
            if len(expr) != 5:
                raise SyntaxError('Glosure: Preprocessing Error: defmacro keyword requires 4 arguments.')
            name = expr[1]
            if not isinstance(name, str):
                raise SyntaxError('Glosure: Preprocessing Error: defmacro keyword requires name to be a symbol.')
            args = expr[2]
            if not isinstance(args, list):
                raise SyntaxError('Glosure: Preprocessing Error: defmacro keyword requires args to be an s-expression.')
            for arg in args:
                if not isinstance(arg, str):
                    raise SyntaxError('Glosure: Preprocessing Error: defmacro keyword requires each macro argument to be a symbol.')
            syms = expr[3]
            if not isinstance(syms, list):
                raise SyntaxError('Glosure: Preprocessing Error: defmacro keyword requires macro gensym symbols to be an s-expression.')
            for sym in syms:
                if not isinstance(sym, str):
                    raise SyntaxError('Glosure: Preprocessing Error: defmacro keyword requires each macro gensym symbol to be a symbol.')
            body = expr[4]
            if not isinstance(body, str) and not isinstance(body, list):
                raise SyntaxError('Glosure: Preprocessing Error: defmacro keyword requires body to be either a symbol or an s-expression.')
            if isinstance(body, list):
                for sym in syms:
                    body = deepreplace(body, sym, gensym(env))
            __macros[name] = (args, body)
            return ['begin']
        elif keyword in __macros:
            macroname = keyword
            macroargs, macrobody = __macros[macroname]
            args = expr[1:]
            if len(macroargs) == 0:
                if len(args) == 0:
                    return _preprocess(macrobody, env)
                expr = expr[0:]
                expr[0] = _preprocess(macrobody, env)
                return _preprocess(expr, env)
            elif len(macroargs) != len(args):
                raise SyntaxError(f'Glosure: Preprocessing Error: {macroname} macro requires {len(macroargs)} arguments.')
            else:
                body = macrobody[0:]
                for i in range(len(args)):
                    macroarg = macroargs[i]
                    arg = args[i]
                    body = deepreplace(body, macroarg, arg)
                return _preprocess(body, env)
        else:
            return fmap(_preprocess, expr, env)
    return _preprocess(expr, env)

def execute(codeStr, env):
    return evaluate(preprocess(reader(codeStr), env), env)

stl = '''
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

(defmacro foreach (key value collection body) (!keys, !idx, !len) ((lambda ()
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
'''

prepareCode =  stl + '\n' + """
(loop (def sexpr (user_input '</> ')) (print (exec sexpr)) (!= sexpr ';quit'))
"""

env = GlobalEnv()
execute(prepareCode, env)
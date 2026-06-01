Error = function(msg) //This is up to implementation to decide.
    return exit("<color=red><noparse>" + @msg + "</noparse></color>") //reference implementation simply panics. 
end function
reader = function(codeStr) //code string to s-expression
    newline = char(10)
    isWs = {",": 1, " ": 1, char(9): 1, newline: 1, char(13): 1}
    isDel = {",": 1, " ": 1, ".": 1, "'": 1, "(": 1, ")": 1, ";": 1, char(9): 1, newline: 1, char(13): 1}
    isNum = {"0": 1, "1": 1, "2": 1, "3": 1, "4": 1, "5": 1, "6": 1, "7": 1, "8": 1, "9": 1, ".": 1}
    len = codeStr.len
    pos = 0
    stack = [[]]
    while pos < len
        c = codeStr[pos]
        pos = pos + 1
        if isWs.hasIndex(c) then continue //ignore whitespace
        if c == "(" then //parse a new list
            stack.push([])
        else if c == ")" then //end a list
            if stack.len < 2 then return Error("Glosure: Error: Unbalanced parenthesis.")
            top = stack.pop
            stack[-1].push(top)
        else if isNum.hasIndex(c) or (c == "-" and pos < len and isNum.hasIndex(codeStr[pos])) then //tokenize number
            start = pos - 1
            while pos < len and isNum.hasIndex(codeStr[pos])
                pos = pos + 1
            end while
            stack[-1].push(val(codeStr[start:pos]))
        else if c == "'" then //tokenize string
            token = ["'"]
            while pos < len and codeStr[pos] != "'"
                if pos < len - 1 and codeStr[pos] == "\" then //"
                    pos = pos + 1
                    if codeStr[pos] == "t" then
                        token.push(char(9))
                    else if codeStr[pos] == "n" then
                        token.push(char(10))
                    else if codeStr[pos] == "r" then
                        token.push(char(13))
                    else
                        token.push(codeStr[pos])
                    end if
                else
                    token.push(codeStr[pos])
                end if
                pos = pos + 1
            end while
            if pos >= len then return Error("Glosure: Error: Unbalanced quotes.")
            token.push("'")
            pos = pos + 1
            stack[-1].push(token.join(""))
        else if c == ";" then //ignore comment
            if pos < len and codeStr[pos] == "|" then //multiline comment ;| ... |;
                pos = pos + 1
                while pos < len - 1
                    if codeStr[pos] == "|" and codeStr[pos + 1] == ";" then
                        pos = pos + 2
                        break
                    end if
                    pos = pos + 1
                end while
            else //single-line comment
                while pos < len and codeStr[pos] != newline
                    pos = pos + 1
                end while
                if pos < len and codeStr[pos] == newline then pos = pos + 1
            end if
        else //tokenize symbol
            start = pos - 1
            while pos < len and not isDel.hasIndex(codeStr[pos])
                pos = pos + 1
            end while
            stack[-1].push(codeStr[start:pos])
        end if
    end while
    if stack.len != 1 then return Error("Glosure: Error: Unbalanced parenthesis.")
    return ["begin"] + stack[0]
end function
Env = function(__outer) //environment for Glosure, only build new environment when calling lambda.
    Error = @Error
    env = {}
    env.classID = "env"
    env.__outer = __outer
    if __outer == null then env.__outest = env else env.__outest = __outer.__outest
    env.__local = {}
    env.contains = function(self, symbol)
        return hasIndex(self.__local, @symbol)
    end function
    env.def = function(self, symbol, value)
        self.__local[@symbol] = @value
        return @value
    end function
    env.set = function(self, symbol, value)
        if self.contains(@symbol) then return @self.def(@symbol, @value)
        if self.__outer then return @self.__outer.set(@symbol, @value) else return Error("Glosure: Runtime Error: Unknown symbol '" + @symbol + "'.")
    end function
    env.get = function(self, symbol)
        if self.contains(@symbol) then return @self.__local[@symbol]
        if self.__outer then return @self.__outer.get(symbol) else return Error("Glosure: Runtime Error: Unknown symbol '" + @symbol + "'.")
    end function
    return env
end function
eval = function(expr, env) //evaluate Glosure s-expression
    if not @expr isa list then
        if not @expr isa string then return @expr
        if expr[0] == "'" then return expr[1:-1] else return env.get(expr)
    end if
    if not len(expr) then return null
    first = @expr[0]
    if @first == "def" then //bind value to symbol
        if len(@expr) < 3 then return Error("Glosure: Runtime Error: def keyword requires 2 arguments.") else return env.def(@expr[1], eval(@expr[2], env))
    else if @first == "=" then
        if len(@expr) < 3 then return Error("Glosure: Runtime Error: = keyword requires 2 arguments.") else return env.set(@expr[1], eval(@expr[2], env))
    else if @first == "quote" then
        if len(@expr) != 2 then return Error("Glosure: Runtime Error: quote keyword requires 2 arguments.") else return @expr[1]
    else if @first == "if" then //if statement
        if len(@expr) < 3 then return Error("Glosure: Runtime Error: if keyword requires 2 or 3 arguments.")
        if eval(@expr[1], env) then return eval(@expr[2], env)
        if len(@expr) > 3 then return eval(@expr[3], env) else return null
    else if @first == "loop" then //loop if the last argument evaluate to true.
        while len(@expr) == 1 //(loop) halts the program forever.
        end while
        result = null
        for stmt in @expr[1:]
            result = eval(@stmt, env)
        end for
        while @result
            for stmt in @expr[1:]
                result = eval(@stmt, env)
            end for
        end while
        return @result
    else if @first == "lambda" then //lambda statement
        if len(@expr) < 3 then return Error("Glosure: Runtime Error: lambda keyword requires 2 or more arguments.")
        if not @expr[1] isa list then return Error("Glosure: Runtime Error: lambda requires a list as params.")
        return {
            "classID": "lambda",
            "params": @expr[1],
            "body": expr[2:],
            "env": @env,
        }
    else if @first == "begin" then //evaluate each argument and return the last one.
        result = null
        for stmt in expr[1:]
            result = eval(@stmt, env)
        end for
        return @result
    else if @first == "exec" then //interpret a string as Glosure code.
        if len(@expr) != 2 then return Error("Glosure: Runtime Error: exec keyword requires 1 argument.") else return execute(eval(@expr[1], env), env)
    else if @first == "eval" then //evaluate a list as Glosure code.
        if len(@expr) != 2 then return Error("Glosure: Runtime Error: eval keyword requires 1 argument.") else return eval(eval(@expr[1], env), env)
    else if @first == "glosure" then //build a "glosure"(host function), advanced feature, extremely dangerous
        if len(@expr) < 3 then return Error("Glosure: Runtime Error: glosure keyword requires 2 or more arguments.")
        if not @expr[1] isa list then return Error("Glosure: Runtime Error: glosure requires a list as params.")
        if len(@expr[1]) > 5 then return Error("Glosure: Runtime Error: glosure can only take 5 or less params.")
        lambda = {
            "classID": "glosure",
            "params": @expr[1],
            "body": expr[2:],
            "env": @env,
        }
        __eval = @eval
        __env = @env
        buildGlosure = function
            __eval = @outer.__eval
            __env = @outer.__env
            lambda = @outer.lambda
            glosure0 = function()
                return __eval([lambda], __env)
            end function
            glosure1 = function(arg0)
                return __eval([lambda, @arg0], __env)
            end function
            glosure2 = function(arg0, arg1)
                return __eval([lambda, @arg0, @arg1], __env)
            end function
            glosure3 = function(arg0, arg1, arg2)
                return __eval([lambda, @arg0, @arg1, @arg2], __env)
            end function
            glosure4 = function(arg0, arg1, arg2, arg3)
                return __eval([lambda, @arg0, @arg1, @arg2, @arg3], __env)
            end function
            glosure5 = function(arg0, arg1, arg2, arg3, arg4)
                return __eval([lambda, @arg0, @arg1, @arg2, @arg3, @arg4], __env)
            end function
            if len(lambda.params) == 0 then return @glosure0
            if len(lambda.params) == 1 then return @glosure1
            if len(lambda.params) == 2 then return @glosure2
            if len(lambda.params) == 3 then return @glosure3
            if len(lambda.params) == 4 then return @glosure4 else return @glosure5
        end function
        return buildGlosure
    else if @first == "dot" then //invoke host method. Warning: more arguments than a method can take will result in crash and the Glosure interpreter cannot catch this error!
        if len(expr) < 3 then return Error("Glosure: Runtime Error: dot keyword requires at least 2 arguments.")
        if len(expr) > 8 then return Error("Glosure: Runtime Error: dot keyword take at most 7 params but received " + (len(expr) - 1) + " arguments.")
        args = []
        for arg in expr[1:]
            args.push(eval(@arg, env))
        end for
        object = @args[0]
        method = @object[@args[1]]
        args = args[2:]
        if len(args) == 0 then return method(@object)
        if len(args) == 1 then return method(@object, @args[0])
        if len(args) == 2 then return method(@object, @args[0], @args[1])
        if len(args) == 3 then return method(@object, @args[0], @args[1], @args[2])
        if len(args) == 4 then return method(@object, @args[0], @args[1], @args[2], @args[3]) else return method(@object, @args[0], @args[1], @args[2], @args[3], @args[4])
    else if @first == "array" then
        args = []
        for arg in expr[1:]
            args.push(eval(@arg, env))
        end for
        return args
    else if @first == "dict" then
        args = []
        for arg in expr[1:]
            args.push(eval(@arg, env))
        end for
        if len(args) % 2 != 0 then args.push(null) //append a null if the last one does not have a pair.
        ret = {}
        for i in range(0, len(args) - 1, 2)
            ret[@args[i]] = @args[i + 1]
        end for
        return @ret
    else if @first == "context" then
        return env.__local
    else
        func = eval(@first, env)
        args = expr[1:]
        evaluatedArgs = []
        if @func isa map and hasIndex(func, "classID") and (func.classID == "lambda" or func.classID == "glosure") then
            if len(args) > len(func.params) then return Error("Glosure: Runtime Error: calling a " + func.classID + " takes at most " + len(func.params) + " params but received " + len(args) + " arguments.")
            for arg in args
                if func.classID == "lambda" then evaluatedArgs.push(eval(@arg, env)) else evaluatedArgs.push(@arg)
            end for
            while len(evaluatedArgs) < len(func.params)
                evaluatedArgs.push(null) //append null for not enough arguments
            end while
            newEnv = Env(func.env)
            for i in indexes(func.params)
                newEnv.def(@func.params[i], @evaluatedArgs[i])
            end for
            result = null
            for bodyExpr in func.body
                result = eval(@bodyExpr, newEnv)
            end for
            return @result
        else if @func isa funcRef then
            if len(args) > 5 then return Error("Glosure: Runtime Error: glosure takes at most 5 params but received " + len(args) + " arguments.")
            for arg in args
                evaluatedArgs.push(eval(@arg, env))
            end for
            if len(evaluatedArgs) == 0 then return func()
            if len(evaluatedArgs) == 1 then return func(@evaluatedArgs[0])
            if len(evaluatedArgs) == 2 then return func(@evaluatedArgs[0], @evaluatedArgs[1])
            if len(evaluatedArgs) == 3 then return func(@evaluatedArgs[0], @evaluatedArgs[1], @evaluatedArgs[2])
            if len(evaluatedArgs) == 4 then return func(@evaluatedArgs[0], @evaluatedArgs[1], @evaluatedArgs[2], @evaluatedArgs[3])
            return func(@evaluatedArgs[0], @evaluatedArgs[1], @evaluatedArgs[2], @evaluatedArgs[3], @evaluatedArgs[4])
        else
            return Error("Glosure: Runtime Error: '" + @func + "' is not a callable value.")
        end if
    end if
end function
GlobalEnv = function
    globalEnv = Env(null) //global and general methods do not have access to environment. those are for keywords.
    globalEnv.__local["&"] = function(a, b)
        return @a and @b
    end function
    globalEnv.__local["|"] = function(a, b)
        return @a or @b
    end function
    globalEnv.__local["!"] = function(a)
        return not @a
    end function
    globalEnv.__local["=="] = function(a, b)
        return @a == @b
    end function
    globalEnv.__local["!="] = function(a, b)
        return @a != @b
    end function
    globalEnv.__local[">="] = function(a, b)
        return @a >= @b
    end function
    globalEnv.__local["<="] = function(a, b)
        return @a <= @b
    end function
    globalEnv.__local[">"] = function(a, b)
        return @a > @b
    end function
    globalEnv.__local["<"] = function(a, b)
        return @a < @b
    end function
    globalEnv.__local["+"] = function(a, b)
        return @a + @b
    end function
    globalEnv.__local["-"] = function(a, b)
        return @a - @b
    end function
    globalEnv.__local["*"] = function(a, b)
        return @a * @b
    end function
    globalEnv.__local["/"] = function(a, b)
        return @a / @b
    end function
    globalEnv.__local["^"] = function(a, b)
        return @a ^ (@b)
    end function
    globalEnv.__local["%"] = function(a, b)
        return @a % @b
    end function
    globalEnv.__local["isa"] = function(a, b)
        return @a isa @b
    end function
    globalEnv.__local.at = function(a, b)
        return @a[@b]
    end function
    globalEnv.__local.set = function(a, b, c)
        (@a)[@b] = @c
        return @c
    end function
    general = {"active_user": @active_user, "bitwise": @bitwise, "clear_screen": @clear_screen, "command_info": @command_info, "current_date": @current_date, "current_path": @current_path, "exit": @exit, "format_columns": @format_columns, "get_ctf": @get_ctf, "get_custom_object": @get_custom_object, "get_router": @get_router, "get_shell": @get_shell, "get_switch": @get_switch, "home_dir": @home_dir, "include_lib": @include_lib, "is_lan_ip": @is_lan_ip, "is_valid_ip": @is_valid_ip, "launch_path": @launch_path, "mail_login": @mail_login, "nslookup": @nslookup, "parent_path": @parent_path, "print": @print, "program_path": @program_path, "reset_ctf_password": @reset_ctf_password, "typeof": @typeof, "user_bank_number": @user_bank_number, "user_input": @user_input, "user_mail_address": @user_mail_address, "wait": @wait, "whois": @whois, "to_int": @to_int, "time": @time, "abs": @abs, "acos": @acos, "asin": @asin, "atan": @atan, "ceil": @ceil, "char": @char, "cos": @cos, "floor": @floor, "log": @log, "pi": @pi, "range": @range, "round": @round, "rnd": @rnd, "sign": @sign, "sin": @sin, "sqrt": @sqrt, "str": @str, "tan": @tan, "yield": @yield, "slice": @slice, "number": @number, "string": @string, "list": @list, "map": @map, "funcRef": @funcRef, "globals": @globals, "true": true, "false": false, "null": null}
    if typeof(include_lib("/lib/testlib.so")) != "TestLib" then // Greybel compatibility
        general["get_abs_path"] = @get_abs_path
        general["cd"] = @cd
    end if
    for method in general + string + list + map
        globalEnv.def(@method.key, @method.value)
    end for
    return globalEnv
end function

preprocess = function(expr, env) // Preprocesses macros and stuff
    if not env.__outest.hasIndex("__macros") then env.__outest.__macros = {}
    if not env.__outest.hasIndex("__gensymCounter") then env.__outest.__gensymCounter = 0
    __macros = env.__outest.__macros
    fmap = function(f, expr, env) // Maps f(x) to s-expression with env
        expr = expr[0:]
        i = 0
        len = expr.len
        while i < len
            expr[i] = f(@expr[i], env)
            i = i + 1
        end while
        return expr
    end function
    deepreplace = function(expr, a, b) // Replaces an occurence of @a to @b in s-expression
        result = []
        for e in expr
            if e isa list then
                result.push(deepreplace(e, a, b))
            else if e == a then
                result.push(b)
            else
                result.push(e)
            end if
        end for
        return result
    end function
    gensym = function(env) // Generates a unique symbol via counter.
        env.__outest.__gensymCounter = env.__outest.__gensymCounter + 1
        return "#:G" + env.__outest.__gensymCounter
    end function
    _preprocess = function(expr, env)
        if not expr isa list then return expr
        if expr.len == 0 then return expr[0:]
        keyword = expr[0]
        if keyword == "defmacro" then // Macro definition
            if expr.len != 5 then return Error("Glosure: Preprocessing Error: defmacro keyword requires 4 arguments.")
            name = expr[1]
            if not name isa string then return Error("Glosure: Preprocessing Error: defmacro keyword requires name to be a symbol.")
            args = expr[2]
            if not args isa list then return Error("Glosure: Preprocessing Error: defmacro keyword requires args to be an s-expression.")
            for arg in args
                if not arg isa string then return Error("Glosure: Preprocessing Error: defmacro keyword requires each macro argument to be a symbol.")
            end for
            syms = expr[3]
            if not syms isa list then return Error("Glosure: Preprocessing Error: defmacro keyword requires macro gensym symbols to be an s-expression.")
            for sym in syms
                if not sym isa string then return Error("Glosure: Preprocessing Error: defmacro keyword requires each macro gensym symbol to be a symbol.")
            end for
            body = expr[4]
            if not body isa string and not body isa list then return Error("Glosure: Preprocessing Error: defmacro keyword requires body to be either a symbol or an s-expression.")
            if body isa list then
                for sym in syms
                    body = deepreplace(body, sym, gensym(env))
                end for
            end if
            __macros[name] = [args, body]
            return ["begin"] // special form that does nothing.
        else if __macros.hasIndex(keyword) then // Macro expansion
            macroname = keyword
            macroargs = __macros[macroname][0]
            macrobody = __macros[macroname][1]
            args = expr[1:]
            if macroargs.len == 0 then
                if args.len == 0 then return _preprocess(macrobody, env)
                expr = expr[0:]
                expr[0] = _preprocess(macrobody, env)
                return _preprocess(expr, env)
            else if macroargs.len != args.len then
                return Error("Glosure: Preprocessing Error: " + macroname + " macro requires " + macroargs.len + " arguments.")
            else
                body = macrobody[0:]
                for i in args.indexes
                    macroarg = macroargs[i]
                    arg = args[i]
                    body = deepreplace(body, macroarg, arg)
                end for
                return _preprocess(body, env)
            end if
        else
            return fmap(@_preprocess, expr, env)
        end if
    end function
    return _preprocess(expr, env)
end function

execute = function(codeStr, env)
    return eval(preprocess(reader(codeStr), env), env)
end function

//Standard Glosure Library
stl = "
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

(defmacro repeat (times body) (!times !result) (if
    (> (def !times times) 0)
    (begin
        (def !result null)
        (loop (= !result body) (-- !times))
        !result)))

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
"

prepareCode = stl + char(10) + "
;;
;; REPL
;;
(if (== (typeof (include_lib '/lib/testlib.so')) 'TestLib')
    (print 'REPL is unavailable in Greybel.')
    (begin
        (def exec-cmd (lambda (cmd) (begin
            (def cmd (pull (def args (split (trim cmd) ' '))))
            (def args (join args))
            (def comp (dot (get_shell) 'host_computer'))
            (def file
                (if (dot comp 'File' (get_abs_path cmd))
                    (dot comp 'File' (get_abs_path cmd))
                    (if (dot comp 'File' (+ '/bin/' cmd)) 
                        (dot comp 'File' (+ '/bin/' cmd))
                        (if (dot comp 'File' (+ '/usr/bin/' cmd)) 
                            (dot comp 'File' (+ '/usr/bin/' cmd)) null))))
            (if file
                (if (| (dot file 'is_folder') (dot file 'is_binary')) 
                    (dot (get_shell) 'launch' (dot file 'path') args) 
                    (if (dot file 'has_permission' 'r')
                        (dot (get_shell) 'launch' (program_path) (+ (dot file 'path') (+ ' ' args)))
                        (print 'Permission denied.')))
                (print (+ cmd ': command not found'))))))
        (if (! params)
            (while (!= (def code-str (user_input '</> ' 0 0 1)) (+ (char 59) 'quit'))
                (if code-str
                    (if (== code-str 'clear')
                        (clear_screen)
                        (if (== code-str 'exit')
                            (exit)
                            (if (== script-path '/bin/bash') 
                                (if (== (indexOf code-str (char 40)) null)
                                    (exec-cmd code-str)
                                    (print (exec code-str)))
                                (print (exec code-str)))))))
            (if (| (== (at params 0) '-h') (== (at params 0) '--help'))
                (print (join (array 'Start REPL: ' (at (split (program_path) '/') (- 0 1)) '\nExecute source file: ' (at (split (program_path) '/') (- 0 1)) ' [file_path]') ''))
                (if (! (def file (dot (dot (get_shell) 'host_computer') 'File' (at params 0))))
                    (print 'File not found.')
                    (if (dot file 'has_permission' 'r')
                        ((lambda ()
                            (def params (slice params 1))
                            (def script-path (dot file 'path'))
                            (exec (dot file 'get_content'))))
                        (print 'Permission denied.')))))))
" //This one is hardcoded code you run at start up. Change it to your own for your own embedded apps.
env = Env(GlobalEnv)
execute(prepareCode, env)

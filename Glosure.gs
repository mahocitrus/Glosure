Error = function(msg) //This is up to implementation to decide.
    return exit("<color=red><noparse>" + @msg + "</noparse></color>") //reference implementation simply panics. 
end function
reader = function(codeStr) //code string to s-expression
    codeStr = values(codeStr)
    stack = [[]]
    while len(codeStr)
        token = []
        c = codeStr.pull
        if (", " + char(9) + char(10) + char(13)).indexOf(c) != null then //ignore whitespace
            continue
        else if c == "(" then //parse a new list
            stack.push([])
        else if c == ")" then //end a list
            if len(stack) < 2 then return Error("Glosure: Error: Unbalanced parenthesis.")
            curr = stack.pop
            stack[-1].push(curr)
        else if indexOf("0123456789.", c) != null then //tokenize number
            token.push(c)
            while len(codeStr) and indexOf("0123456789.", codeStr[0]) != null
                token.push(codeStr.pull)
            end while
            stack[-1].push(val(token.join("")))
        else if c == "'" then //tokenize string
            token.push(c)
            while len(codeStr) and codeStr[0] != "'"
                c = codeStr.pull
                token.push(c)
                if c == "\" then token.push(codeStr.pull)
            end while
            codeStr.pull
            stack[-1].push(token.join("") + "'")
        else if c == ";" then //ignore comment
            while len(codeStr) and codeStr[0] != char(10)
                codeStr.pull
            end while
        else //tokenize symbol
            token.push(c)
            while len(codeStr) and (" .'();" + char(9) + char(10) + char(13)).indexOf(codeStr[0]) == null
                token.push(codeStr.pull)
            end while
            stack[-1].push(token.join(""))
        end if
    end while
    if len(stack) != 1 then return Error("Glosure: Error: Unbalanced parenthesis.")
    return ["begin"] + stack[0]
end function
Env = function(__outer) //environment for Glosure, only build new environment when calling lambda.
    Error = @Error
    env = {}
    env.classID = "env"
    env.__outer = __outer
    if __outer == null then
        env.__outest = null
    else
        if __outer.__outest == null then env.__outest = env else env.__outest = __outer.__outest
    end if
    env.__local = {}
    env.get = function(symbol)
        if hasIndex(self.__local, @symbol) then return @self.__local[@symbol]
        if self.__outer then return @self.__outer.get(symbol)
        return Error("Glosure: Runtime Error: Unknown symbol '" + symbol + "'.")
    end function
    env.set = function(symbol, value)
        self.__local[@symbol] = @value
        return @value
    end function
    return env
end function
eval = function(expr, env) //evaluate Glosure s-expression
    if not @expr isa list then
        if not @expr isa string then return @expr
        if expr[0] == "'" then
            stri = expr[1:-1]
            ret = []
            i = 0
            while i < len(stri)
                if stri[i] == "\" and i < len(stri) - 1 then
                    i = i + 1
                    if stri[i] == "t" then
                        ret.push(char(9))
                    else if stri[i] == "n" then
                        ret.push(char(10))
                    else if stri[i] == "r" then
                        ret.push(char(13))
                    else
                        ret.push(stri[i])
                    end if
                else
                    ret.push(stri[i])
                end if
                i = i + 1
            end while
            return ret.join("")
        else
            return env.get(expr)
        end if
    end if
    if not len(expr) then return null
    first = @expr[0]
    if @first == "def" then //bind value to symbol
        if len(@expr) < 3 then return Error("Glosure: Runtime Error: def keyword requires 2 arguments.")
        return env.set(@expr[1], eval(@expr[2], env))
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
        if len(@expr) != 2 then return Error("Glosure: Runtime Error: exec keyword requires 1 argument.")
        return execute(eval(@expr[1], env), env)
    else if @first == "eval" then //evaluate a list as Glosure code.
        if len(@expr) != 2 then return Error("Glosure: Runtime Error: eval keyword requires 1 argument.")
        return eval(eval(@expr[1], env), env)
    else if @first == "glosure" then //build a "glosure"(host function), advanced feature, extremely dangerous
        if len(@expr) < 3 then return Error("Glosure: Runtime Error: glosure keyword requires 2 or more arguments.")
        if not @expr[1] isa list then return Error("Glosure: Runtime Error: glosure requires a list as params.")
        if len(@expr[1]) > 5 then return Error("Glosure: Runtime Error: glosure can only take 5 or less params.")
        lambda = {
            "classID": "lambda",
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
            if len(lambda.params) == 4 then return @glosure4
            return @glosure5
        end function
        return buildGlosure
    else if @first == "dot" then //invoke host method. Warning: more arguments than a method can take will result in crash and the Glosure interpreter cannot catch this error!
        length = []
        temp = function(object, method, args)
            method = @object[@method]
            return method(@object)
        end function
        length.push(@temp)
        temp = function(object, method, args)
            method = @object[@method]
            return method(@object, @args[0])
        end function
        length.push(@temp)
        temp = function(object, method, args)
            method = @object[@method]
            return method(@object, @args[0], @args[1])
        end function
        length.push(@temp)
        temp = function(object, method, args)
            method = @object[@method]
            return method(@object, @args[0], @args[1], @args[2])
        end function
        length.push(@temp)
        temp = function(object, method, args)
            method = @object[@method]
            return method(@object, @args[0], @args[1], @args[2], @args[3])
        end function
        length.push(@temp)
        temp = function(object, method, args)
            method = @object[@method]
            return method(@object, @args[0], @args[1], @args[2], @args[3], @args[4])
        end function
        length.push(@temp)
        if len(expr) < 3 then return Error("Glosure: Runtime Error: dot keyword requires at least 2 arguments.")
        if len(expr) > len(length) then return Error("Glosure: Runtime Error: dot keyword take at most " + (len(length) - 1) + " params but received " + (len(expr) - 1) + " arguments.")
        args = []
        for arg in expr[1:]
            args.push(eval(@arg, env))
        end for
        object = @args[0]
        method = @args[1]
        args = args[2:]
        run = @length[len(args)]
        return run(@object, @method, args)
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
        if @func isa map and hasIndex(func, "classID") and func.classID == "lambda" then
            if len(args) > len(func.params) then return Error("Glosure: Runtime Error: calling a lambda takes at most " + len(func.params) + " params but received " + len(args) + " arguments.")
            for arg in args
                evaluatedArgs.push(eval(@arg, env))
            end for
            while len(evaluatedArgs) < len(func.params)
                evaluatedArgs.push(null) //append null for not enough arguments
            end while
            newEnv = Env(func.env)
            for i in indexes(func.params)
                newEnv.set(@func.params[i], @evaluatedArgs[i])
            end for
            result = null
            for bodyExpr in func.body
                result = eval(@bodyExpr, newEnv)
            end for
            return @result
        else if @func isa funcRef then
            for arg in args
                evaluatedArgs.push(eval(@arg, env))
            end for
            length = []
            temp = function(args, func)
                return func()
            end function
            length.push(@temp)
            temp = function(args, func)
                return func(@args[0])
            end function
            length.push(@temp)
            temp = function(args, func)
                return func(@args[0], @args[1])
            end function
            length.push(@temp)
            temp = function(args, func)
                return func(@args[0], @args[1], @args[2])
            end function
            length.push(@temp)
            temp = function(args, func)
                return func(@args[0], @args[1], @args[2], @args[3])
            end function
            length.push(@temp)
            temp = function(args, func)
                return func(@args[0], @args[1], @args[2], @args[3], @args[4])
            end function
            length.push(@temp)
            if len(evaluatedArgs) > len(length) - 1 then return Error("Glosure: Runtime Error: glosure takes at most " + (len(length) - 1) + " params but received " + len(evaluatedArgs) + " arguments.")
            run = @length[len(evaluatedArgs)]
            return run(evaluatedArgs, @func)
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
        globalEnv.__local[@method.key] = @method.value
    end for
    return globalEnv
end function

preprocess = function(expr, env) // Preprocesses macros and stuff
    if not env.__outest.hasIndex("__macros") then env.__outest.__macros = {} // for macros defined w/ defmacro
    if not env.__outest.hasIndex("__symbols") then env.__outest.__symbols = [] // gensym(env) calls
    fmap = function(f, expr, env) // Maps f(x) to s-expression with env
        expr = [] + expr
        for i in expr.indexes
            expr[i] = f(@expr[i], env)
        end for
        return expr
    end function
    deepreplace = function(expr, a, b) // Replaces an occurence of @a to @b in s-expression
        result = []
        for e in expr
            if @e isa list then
                result.push(deepreplace(e, @a, @b))
            else if @e == @a then
                result.push(@b)
            else
                result.push(@e)
            end if
        end for
        return result
    end function
    gensym = function(env) // Generates and ensures a unique symbol.
        randsym = function
            uniquesim = ""
            for i in range(0, 7)
                uniquesim = uniquesim + "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"[floor(rnd * 62)]
            end for
            return "#:G" + uniquesim
        end function
        while true
            sym = randsym
            if env.__outest.__symbols.indexOf(sym) == null then
                env.__outest.__symbols.push(sym)
                return sym
            end if
        end while
    end function
    if not @expr isa list then
        return @expr
    else
        if expr.len == 0 then
            return fmap(@preprocess, expr, env)
        else
            keyword = expr[0]
            if keyword == "defmacro" then // Macro definition
                if expr.len != 5 then return Error("Glosure: Preprocessing Error: defmacro keyword requires 4 arguments.")
                name = @expr[1]
                if not @name isa string then return Error("Glosure: Preprocessing Error: defmacro keyword requires name to be a symbol.")
                args = @expr[2]
                if not @args isa list then return Error("Glosure: Preprocessing Error: defmacro keyword requires args to be an s-expression.")
                for arg in args
                    if not @arg isa string then return Error("Glosure: Preprocessing Error: defmacro keyword requires each macro argument to be a symbol.")
                end for
                syms = @expr[3]
                if not @syms isa list then return Error("Glosure: Preprocessing Error: defmacro keyword requires macro gensym symbols to be an s-expression.")
                for sym in syms
                    if not @sym isa string then return Error("Glosure: Preprocessing Error: defmacro keyword requires each macro gensym symbol to be a symbol.")
                end for
                body = @expr[4]
                if not @body isa string and not @body isa list then return Error("Glosure: Preprocessing Error: defmacro keyword requires body to be either a symbol or an s-expression.")
                if body isa list then
                    for i in syms.indexes
                        sym = syms[i]
                        uniquesim = gensym(env) // Translates into unique symbols in macro expansion
                        syms[i] = uniquesim
                        body = deepreplace(body, sym, uniquesim)
                    end for
                    for i in args.indexes
                        arg = args[i]
                        uniquearg = gensym(env) // So that args of macro won't overlap with symbols in expansion
                        args[i] = uniquearg
                        body = deepreplace(body, arg, uniquearg)
                    end for
                end if
                env.__outest.__macros[name] = [args, body]
            else if keyword == "quote" then // Symbols quoting
                buildString = function(expr)
                    if not expr isa list then return expr
                    ret = []
                    for atom in expr
                        ret.push(buildString(atom))
                    end for
                    return "(" + ret.join(" ") + ")"
                end function
                ret = []
                for atom in expr[1:]
                    ret.push(buildString(atom))
                end for
                return "'" + ret.join(" ") + "'"
            else if env.__outest.__macros.hasIndex(keyword) then // Macro expansion
                macroname = keyword
                macroargs = env.__outest.__macros[macroname][0]
                macrobody = env.__outest.__macros[macroname][1]
                args = expr[1:]
                if macroargs.len == 0 then
                    if args.len == 0 then return preprocess(macrobody, env)
                    expr = [] + expr
                    expr[0] = preprocess(macrobody, env)
                    return preprocess(expr, env)
                else if macroargs.len != args.len then
                    return Error("Glosure: Preprocessing Error: " + macroname + " macro requires " + macroargs.len + " arguments.")
                else
                    body = [] + macrobody
                    for i in args.indexes
                        macroarg = macroargs[i]
                        arg = args[i]
                        body = deepreplace(body, macroarg, arg)
                    end for
                    return preprocess(body, env)
                end if
            else
                return fmap(@preprocess, expr, env)
            end if
        end if
    end if
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

(defmacro foreach (key value collection body) (!keys) ((lambda () 
    (def !keys (indexes collection))
    (if !keys (begin
        (loop 
            (def key (pull !keys))
            (def value (at collection key))
            body
            !keys)
        value)))))

(defmacro defalias (name keyword) () (defmacro name () () keyword))

(defmacro swap (a b) (!temp) (begin
    (def !temp a)
    (def a b)
    (def b !temp)))

(defmacro ++ (var) () (def var (+ var 1)))

(defmacro var++ (var) (!temp) (begin
    (def !temp var)
    (def var (+ var 1))
    !temp))

(defmacro -- (var) () (def var (- var 1)))

(defmacro var-- (var) (!temp) (begin
    (def !temp var)
    (def var (- var 1))
    !temp))

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
                        (begin
                            (def params (slice params 1))
                            (def script-path (dot file 'path'))
                            (exec (dot file 'get_content')))
                        (print 'Permission denied.')))))))
" //This one is hardcoded code you run at start up. Change it to your own for your own embedded apps.
env = Env(GlobalEnv)
execute(prepareCode, env)

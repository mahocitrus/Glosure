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
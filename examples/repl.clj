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
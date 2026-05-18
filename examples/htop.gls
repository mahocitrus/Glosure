(def htop (lambda (target-comp switch-comp) ;pass two computer object, switch-comp is for killswitch, when switch-comp is not running Notepad the loop stops.
    (def bar (lambda (n) (join (array '<color=#21bcff>' (* '#' (ceil (/ n 4))) '<color=#032e41>' (* '-' (- 25 (ceil (/ n 4)))) '</color>') '')))
    (while (indexOf (dot switch-comp 'show_procs') 'Notepad') (begin
        (def tasks (array)) (def cpu 0) (def mem 0)
        (def lines (slice (split (dot target-comp 'show_procs') '\\n') 1))
        (while lines (begin
            (def line (split (pull lines) ' ')) (def cpu (+ cpu (val (slice (at line 2) 0 (- 0 1))))) (def mem (+ mem (val (slice (at line 3) 0 (- 0 1)))))
            (push tasks (join (array (if (== (at line 0) 'root') '<color=#ff4b4b>' '<color=#fbfbfb>') (at line 0) ' <color=#20ff98>' (at line 1) ' <color=#21bcff>' (at line 2) ' <color=#21bcff>' (at line 3) ' <color=#baff50>' (at line 4) '</color>') ''))))
        (wait (/ (! (print (+ (join (array '<color=#9d9d9d>Check <color=#20ff98>' (len tasks) ' <color=#9d9d9d>processes on <color=#fbfbfb>' (dot target-comp 'get_name') '<color=#9d9d9d>@<color=#fbfbfb>' (dot target-comp 'public_ip') '<color=#9d9d9d>:<color=#fbfbfb>' (dot target-comp 'local_ip') '\n<color=#fbfbfb>cpu_usage: [' (bar cpu) '<color=#fbfbfb>]==[ <color=#21bcff>' cpu '% <color=#fbfbfb>]\n<color=#fbfbfb>mem_usage: [' (bar mem) '<color=#fbfbfb>]==[ <color=#21bcff>' mem '% <color=#fbfbfb>]</color>\n') '') (format_columns (join (+ (array '<color=#9d9d9d>USER <color=#9d9d9d>PID <color=#9d9d9d>CPU <color=#9d9d9d>MEM <color=#9d9d9d>COMMAND</color>') tasks) '\\n'))) 1)) 2))))))

(set (at globals 'command') 'htop' (glosure (a b c d) ;this one is for 5hell htop
    (def bar (lambda (n l) (join (array '<color=#21bcff>' (* '#' (ceil (* (/ n  100) l))) '</color><color=#032e41>' (* '-' (- l (ceil (* (/ n  100 ) l)))) '</color>') '')))
    (def comp (dot (get_shell) 'host_computer'))
    (while (!= (indexOf (def procs (dot comp 'show_procs')) 'Notepad') null) (begin
        (def tasks (array))
        (def cpu 0)
        (def mem 0)
        (def lines (slice (split procs '\\n') 1))
        (while lines (begin
            (def task (split (pull lines) ' '))
            (def cpu (+ cpu (val (slice (at task 2) 0 (- 0 1)))))
            (def mem (+ mem (val (slice (at task 3) 0 (- 0 1)))))
            (push tasks (if (== (at task 0) 'root') (join (array '<color=#ff4b4b>' (at task 0) '</color> <color=#20ff98>' (at task 1) '</color> <color=#21bcff>' (at task 2) '</color> <color=#21bcff>' (at task 3) '</color> <color=#baff50>' (at task 4) '</color>') '') (join (array '<color=#fbfbfb>' (at task 0) '</color> <color=#20ff98>' (at task 1) '</color> <color=#21bcff>' (at task 2) '</color> <color=#21bcff>' (at task 3) '</color> <color=#baff50>' (at task 4) '</color>') '')))))
        (wait (/ (! (print (join (array '<color=#fbfbfb>tasks: ' (len tasks) '</color>\\n<color=#fbfbfb>cpu_usage: [</color>' (bar cpu 25) '<color=#fbfbfb>]==[ </color><color=#21bcff>' cpu '%</color> <color=#fbfbfb>]</color>\n<color=#fbfbfb>mem_usage: [</color>' (bar mem 25) '<color=#fbfbfb>]==[ </color><color=#21bcff>' mem '%</color> <color=#fbfbfb>]</color>\\n' (format_columns (join (+ (array '<color=#9d9d9d>USER</color> <color=#9d9d9d>PID</color> <color=#9d9d9d>CPU</color> <color=#9d9d9d>MEM</color> <color=#9d9d9d>COLOR</color>') tasks) '\\n'))) '') 1)) 2))))))

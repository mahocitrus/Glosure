(begin ;An simple tool env that allows tool-like functionality while beable to self-program.
    (def localShell (get_shell))
    (def localCamp (dot localShell 'host_computer'))
    (def localFile (dot localCamp 'File' '/'))
    (def build (lambda (srcPath outPath) (dot localShell 'build' srcPath outPath)))
    (def cat (lambda (path) (begin
        (def file (dot localCamp 'File' path))
        (if file (dot file 'get_content')))))
    (def cp (lambda (orig dest) (begin
        (def origFile (dot localCamp 'File' orig))
        (if origFile (dot origFile 'copy' dest (dot origFile 'name'))))))
    (def kill (lambda (pid) (dot localCamp 'kill' pid)))
    (def ls (lambda (path) (begin ;This task, a grueling one
        (def folder (dot localCamp 'File' path))
        (if folder (begin
            (def files (+ (dot folder 'get_folders') (dot folder 'get_files')))
            (def output 'NAME TYPE +WRX FILE_SIZE PERMISSIONS OWNER GROUP')
            (while files (begin
                (def file (dot files 'pull'))
                (def nameFile (dot (dot file 'name') 'replace' ' ' '_'))
                (def permission (dot file 'permissions'))
                (def owner (dot file 'owner'))
                (def size (dot file 'size'))
                (def group (dot file 'group'))
                (def type (if (== (dot file 'is_binary') 1) 'bin' (if (== (dot file 'is_binary') 1) 'fld' 'txt')))
                (def wrx (+ (+ (if (dot file 'has_permission' 'w') 'w' '-') (if (dot file 'has_permission' 'r') 'r' '-')) (if (dot file 'has_permission' 'x') 'x' '-')))
                (def output (join (array output '\\n' nameFile ' [' type '] [' wrx '] [' ((lambda (bits) (begin (def units (array 'B' 'KB' 'MB' 'GB' 'TB' 'PT')) (def i 0) (while (> bits 1024) (begin (def bits (/ bits 1024)) (def i (+ i 1))))(+ (round bits 2) (at units i)))) (to_int size)) '] [' permission '] [' owner '] [' group ']') '')))) ;not interesting
            (format_columns output))))))
    
)
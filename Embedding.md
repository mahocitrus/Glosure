# Embedding
Embedding is a common use of this language and deserve its own doc. This doc is for AweTux who made serval bad practices when trying to embed Glosure into X tool.

You should read [5hell implementation](https://github.com/jhook777/5hell-for-Grey-Hack-the-Game/blob/main/contrib.5pk.src#L806) as a reference. Overall, there are a few principles that you should follow.  
1. Do not add custom keywords, remove keywords, or change any part of the reader, eval or preprocess code. The only exception which you can change in the interpreter is Error behaviour. Generally speaking, you should not change how the interpreter works. If you want to limit Glosure's ablity(which you usually should not and does not have to), remove `globals` from `general` map in GlobalEnv and expose selected parts of your data structure instead of the whole `globals` map.
```
//for example, your usecase is a customizable hacktool, you want the user to run arbitrary glosure script on attack.
//you dont want Glosure to access your globals map, but you have a list called 'objects' that contains objects obtained from attacks, and you want to expose it so users can process objects with glosure.
//after removing globals from general map, you should do this.
env.def('objects', objects) //define a variable in Glosure env which points to 'objects' in host env.
```
2. Glosure interpreter needs a permanet, globally available variable to store its env. Env building process should only run once for the whole lifetime for each Glosure interpreter instance. Since a tool usually only contains one active Glosure instance, you can usually run it at the start of your tool or use a check. 5hell does it with a check. You buid a new env by using `env = Env(GlobalEnv)`. After building it, let the interpreter run `prepareCode` on it to init STL and other part to prepare env. You can change `prepareCode` but you should not change STL.
```
if not hasIndex(globals, 'glosureEnv') then //this if statement ensures globals.glosureEnv is defined once.
    globals.glosureEnv = Env(GlobalEnv) // build a new env with 'Env(GlobalEnv)', store it in globals.glosureEnv
    execute(prepareCode, glosureEnv) // execute prepare code to prepare STL and other custom env preparing. You can change prepareCode.
end if
```
3. After reading 1 and 2, if you are still not sure on how to properly embed glosure into your tool, simply paste glosure before any other code, delete anything inside the `prepareCode` string so it looks like the code below, and call `execute('any glosure code', env)` wherever you need glosure.
```
prepareCode = stl + char(10) + "" //empty string
```
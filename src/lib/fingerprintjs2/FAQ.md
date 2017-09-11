#### Can I use this library to uniquely identify users?
##### No, you cannot. This library is built to be able to associate string identifiers with devices. Since there are a lot of identical devices, you will get a lot of identical identifiers.

#### OK, I get it, I cannot _uniquely_ identify users, but can I identify users at all?
##### No, you cannot. This library is strictly for non-deterministic device identification.


#### How good is your library? Can you guarantee that different devices will have different identifiers?
##### This library is not good. It has an error margin of 10-20%

#### Can you improve the library to be 100% accurate for device identification?
##### I don't think it is possible now and don't think it will be possible in the future.

#### Can you improve the library to be more accurate (since you cannot make it 100% accurate)?
##### I can, but it takes a lot of time. I need a lot of devices, enviroments and more importantly - time. Since this is my hobby project, I spend very little time on it.

#### How can I build a complete identification solution?
##### You should either use commercial services, such as https://augur.io, or develop such service yourself. If you don't know how to do it, please use StackOverflow.

#### The fingerprint is changing frequently for me, is library broken?
##### Well, most likely not. You may have different user agents (because of the browser ugprades), or different screen resolutions. You can disable corresponding options (please see README and Wiki for details). V2 will have a callback/extension system which will allow to use UserAgent parsers and cut off the frequently changing parts of user agents (such as verion numbers). If you're sure it is a bug, please submit an issue and don't forget to attach the relevant info about which component, participating in fingerprint building, changes for your from call to call. This will greatly help me fix the issue

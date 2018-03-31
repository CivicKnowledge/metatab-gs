# metatab-gs

Google Apps Script for Sheets Metatab application


This repo  synchronizes with Google Apps Scripts via clasp, a command line
interface for editing Google App Scripts. See the [Clasp documentation for details](https://codelabs.developers.google.com/codelabs/clasp/#0). 

This project is connected to an Apps id:

    1v9CABVDinJJcQUWUExAttKRiebLo874JZ76SxgOJbjzSCSlUlq_m7zE8
    
See the .clasp.json file for this connection. If you want to develop on your
own, you'll probably need to run ``clasp create`` to connect to a different
application, since you wont have permissions to push to the id listed above.

## Running, Testing, Etc. 

You can do basic operations from the clasp cli, but go get access to all of the
operations on an app, you'll need to have access to the script editor. You just
need to push then app, then use clasp to open it.

```bash

$ clasp push
$ clasp open
```


## Deploying to Chrome Web Store


You can 

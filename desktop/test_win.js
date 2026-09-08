const activeWin = require('active-win'); setInterval(async () = const win = await activeWin(); console.log(win?.owner?.name, win?.owner?.processId, win?.title); }, 1000);  

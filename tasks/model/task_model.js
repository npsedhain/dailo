const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

    const TaskSchema = new Schema({
      taskList: [{

      }
        ],
        location: {
          type: String,
        }
        });

mongoose.model('tasks', TaskSchema);

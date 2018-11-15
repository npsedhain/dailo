const mongoose = require('mongoose');
const Task= mongoose.model('tasks');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));

exports.alltasks = function(req, res) {
  Task.find({user: req.session.user})
    .sort({date:'desc'})
    .then(tasks => {
      return res.status(200).json({tasks});
    });
};

exports.addtasks = function( req,res) {
  let errors = [];

  // if(!req.body.location){
  //   errors.push({text:'Please add a location'});
  // }
  // if(!req.body.date){
  //   errors.push({text:'Please add a date'});
  // }
  // if(!req.body.time){
  //   errors.push({text:'Please add a time'});
  // }

  if(errors.length>0){
    return res.status(400).json({errors});
  }else {
    const newTask = {
      taskList: req.body.taskList,
      location: req.body.location
    }
    console.log(req.body.location)
    console.log('New task incoming');
    console.log(newTask);
    new Task(newTask)
      .save()
      .then(task => {
        console.log('Task incoming');
        console.log({task});
      })
  }
};

exports.deletetask = function(req,res) {
  Task.remove({_id: req.params.id})
    .then(()=> {
      return res.status(200).json({ message: 'Task successfully deleted'});
    });
};

exports.edittask = function(req,res){
  console.log('task');
  Task.findOne({_id: req.params.id})
    .then(task => {
      //new values
      task.task_genre = req.body.task_genre;
      task.task_name = req.body.task_name;
      task.task_details = req.body.task_details;

      task.save()
        .then(task => {
          return res.status(200).json({updated_task: task});
        })
      });
};

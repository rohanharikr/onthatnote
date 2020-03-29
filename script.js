let counter = 0,
    inputlength = 0,
    timeCreated,
    title,
    checked,
    createList = 0,
    completed = 0;


function changemode() {
  $('#sun').toggle();
  $('#moon').toggle();
}


$('#tostore').keyup(function(event) {
  inputlength = $('#tostore').val().length;

  if (event.keyCode === 13){
    event.preventDefault();
    storeLocal();
  }

  if (inputlength >= 2) {
    $('#helper').show();
  } else {
    $('#helper').hide();
  }

  $('#charlength').html(inputlength);
});


function storeLocal() {
  checked = (createList - completed);
  const input = $('#tostore').val();
  timeCreated = new Date().toLocaleTimeString();

  $('#helper').hide();  

  if (input !== '') {
    $('#completed, #list').show();
    counter++;
    createList++;
    checked++;

    $('#list').append(`<div class="list"><input type="checkbox" id="checkbox" name="checkbox${counter}"><label for="checkbox${counter}">${input}</label><span class="timecreated">${timeCreated}</span><span id="deleteitem"><i class="fas fa-trash-alt"></i> Delete</span></div>`);
    $('#tostore').val('');
  } else {
    throw new Error('input field empty');
  }

  $('.listcounter').html(createList);
  $('.completed').html(checked);
}


$('#branding span').bind('click keyup keydown', (function() {
  title = $('#branding').find('span').html();
  
  $('title').html(title);
  localStorage.setItem('title', title);

  if ( $('title').find('span').html() < 1 ) {
    $('title').find('span').html('add a note.');
  }

  if (title == 'give me a name') {
    $('#branding').find('span').html('');
  }

  if (event.keyCode === 13) {
    event.preventDefault();
    $('#tostore').focus();
  }

  if ( $('#branding span').html().length > 30 ) {
    $('#branding span').attr('contenteditable', 'false');
  }
}));

$( "#branding" ).keydown(function() {
  if (event.keyCode === 8) {
   $('#branding span').attr('contenteditable', 'true'); 
  }
});

$(function getinputvalue() {
  inputlength = $('#tostore').val().length;
  
  $('#charlength').html(inputlength);

  if (localStorage.getItem('title') !== null) {
    $('#branding').find('span').html(localStorage.getItem('title'));
    $('title').html(localStorage.getItem('title'));
  }
});

$(document).on('click', '#deleteitem', function deleteitem() {
  let checked = (createList - completed);
  
  $(this).parent().remove();
  createList--;
  checked--;
  
  $('.listcounter').html(createList);  
  $('.completed').html(checked);
});


function deleteList() {
  $('#list').html('');
  localStorage.clear();
}


$(document).on('mousedown', '#checkbox', function() {
  if ( !$(this).is(":checked") ) {
    let completedTask = $(this).parent().find('label').text();
    let checked = (createList - completed);
    completed++;
    checked--;
    $('.completed').html(checked);
    $('.checked').html(completed);
    $('#completed').append(`<div class="list"><input type="checkbox" id="checkbox" name="checkbox${counter}" checked><label for="checkbox${counter}">${completedTask}</label></div>`);
    $(this).parent().remove();
  }
});


$('#dellocalstorage').click(function clearlocalstorage() {
  localStorage.clear();
  location.reload();
});


window.addEventListener('click', function(e) {
  if (!document.getElementById('tostore').contains(e.target) && $('#tostore').val() !== '') {
    storeLocal();
  }
});


$('#sort').click(function() {
  $('#list .list').sort(function(a, b) {
  return a.id < b.id ? -1 : 1;
  }).appendTo('#list');

  $('#completed .list').sort(function(a, b) {
  return a.id < b.id ? -1 : 1;
  }).appendTo('#completed');
});
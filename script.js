let counter = 0;
let inputlength = 0;
let timeCreated;
let notetitle;
let createList = 0;
let completed = 0;

function changemode(){
	$("#sun").toggle();
	$("#moon").toggle();
}

$("#tostore").keyup(function (event) {
	if (event.keyCode === 13) {
		event.preventDefault();
		storeLocal();
	}

	 if (inputlength >= 2) {
		$("#helper").show();
	} else {
		$("#helper").hide();
	}
	
	inputlength = $('#tostore').val().length;
	$("#charlength").html(inputlength);

});

$('#tostore').on('kedown', function() {
   //code to be executed
 }).on('keydown', function(e) {
   if (inputlength >= 2) {
		$("#helper").show();
	}
 });

$("#branding").keyup(function () {
	title = $('#branding').find('span').html();
	$('title').html(title);
	localStorage.setItem("title", title);

	if ($('title').find('span').html() < 1) {
		$('title').find('span').html("add a note.")
	}
});

$("#tostore").click(function () {
	
});

$("#branding").click(function () {
	let title = $('#branding').find('span').html();

	if (title == "give me a name") {
		$('#branding').find('span').html('');
	}
});

(function getinputvalue() {

	// $('#branding').find('br').remove();

	inputlength = $('#tostore').val().length;
	$("#charlength").html(inputlength);

	if (localStorage.getItem("title") !== null) {
		$('#branding').find('span').html(localStorage.getItem("title"));
		$('title').html(localStorage.getItem("title"));
	}

})();

function storeLocal() {
	$("#helper").hide();
	const input = $('#tostore').val();
	timeCreated = new Date().toLocaleTimeString();

	$("#completed, #list").show();

	if (input !== "") {
		counter++;
		$("#list").append(`<div class="list"><input type="checkbox" id="checkbox" name="checkbox${counter}"><label for="checkbox${counter}">${input}</label><span class="timecreated">${timeCreated}</span><span id="deleteitem"><i class="fas fa-trash-alt"></i> Delete</span></div>`)
		$('#tostore').val("");
	} else {
		throw new Error("input field empty");
	}

	createList++;
	$(".listcounter").html(createList);

	let checked = (createList - completed)
	$(".completed").html(checked);
}

$(document).on('click', '#deleteitem', function () {
	console.log("del")
	$(this).parent().remove();

	createList--;
	$(".listcounter").html(createList);

	let checked = (createList - completed)
	$(".completed").html(checked);
});

function deleteList() {
	$("#list").html("");
	localStorage.clear();
}


$(document).on('mousedown', '#checkbox', function () {

	if (!$(this).is(':checked')) {

		let complete = $(this).find('label').html();
		completed++;

		let checked = (createList - completed)

		$(".completed").html(checked);
		$(".checked").html(completed);
		$("#completed").append(`<div class="list"><input style="border: 1px solid #696969" type="checkbox" id="checkbox" name="checkbox${counter}" checked><label for="checkbox${counter}">${complete}</label></div>`)
		// $(this).fadeOut(600, function() {$(this).parent().remove(); });
		$(this).parent().remove();
	}
});


clearlocalstorage = () => {
	localStorage.clear();
	location.reload();
};

window.addEventListener('click', function(e){   
  if (!document.getElementById('tostore').contains(e.target) && $('#tostore').val() !== ""){
  	storeLocal();
  }
});


$("#sort").click(function () {
	$('#list .list').sort(function(a, b) {
	    return a.id < b.id ? -1 : 1;
	}).appendTo('#list');
});


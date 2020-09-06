<script>
	import { slide, fade } from 'svelte/transition'
	import { onMount } from 'svelte'

	import countapi from 'countapi-js'

	let newNote = ""
	let isTasksVisible = false
	let taskExists = false
	let completedTaskExists = false
	let maxWordLimitReached = false

	let id = "..."

	let hits

	$: total = tasks.length + completedTasks.length
	$: tasks = []
	$: completedTasks = []

	$: title = "on that note"

	onMount(async () => {
		if (window.localStorage.length !== 0){
			title = localStorage.getItem("title")
			let localTasks = localStorage.getItem("inProgress")
			tasks = localTasks.split(',')
			let localCompletedTasks = localStorage.getItem("completed")
			completedTasks = localCompletedTasks.split(',')
			total = localStorage.getItem("count")
			isTasksVisible = true
		}

		if(localStorage.getItem("input")){
			newNote = localStorage.getItem("input")
		}

		await fetch('https://api.github.com/repos/rohanharikr/onthatnote/commits')
			.then((response) => response.json())
			.then((data) => {
			id = data[0].sha.slice(0, 7)
		})
	});

	countapi.visits('global').then((result) => {
	   hits = result.value
	});

	function addTodo(){
		if (!tasks.includes(newNote) && !completedTasks.includes(newNote)){
			tasks = [...tasks, newNote]
			newNote = ""
			storeLocally()
		} else if(completedTasks.includes(newNote)){
			completedTaskExists = true
			setTimeout(()=>completedTaskExists = false, 2000)
		} else if(tasks.includes(newNote)){
			taskExists = true
			setTimeout(()=>taskExists = false, 2000)
		}
	}

	function uncheck(i){
		tasks = [...tasks, i]

		completedTasks = completedTasks.filter(function(value){ 
			return value !== i
		})
		storeLocally()
	}

	function deleteTodo(i,del){
		tasks = tasks.filter(function(value){ 
			return value !== i
		})

		storeLocally()

		if(tasks.length === 0 && completedTasks.length === 0){
			isTasksVisible = false
		}

		if(del == true){
			//
		}
	}

	function storeLocally(){
		localStorage.setItem("title", title); 
		localStorage.setItem("inProgress", tasks);
		localStorage.setItem("completed", completedTasks);
		localStorage.setItem("count", total);
		localStorage.setItem("input", newNote);
	}

	function done(i){
		completedTasks = [...completedTasks, i]
		deleteTodo(i);
		storeLocally()
	}
	
	function handleKeydown(event) {
		let key = event.key;
		let keyCode = event.keyCode;
		if (keyCode === 13 &&  newNote){
			addTodo();
			isTasksVisible = true
		}
		if(newNote.length >= 35){
			maxWordLimitReached = true
			setTimeout(()=>maxWordLimitReached = false, 5000)
		} else{
			maxWordLimitReached = false
		}
		storeLocally()
	}

	function makeNote(event){
		if(newNote){
			addTodo()
			isTasksVisible = true
		}
	}

	function startOver(){
		let newNote = ""
		$: total = 0
		$: tasks = []
		$: completedTasks = []
		isTasksVisible = false;
		title = "on that note"
		localStorage.clear();
	}
</script>

<svelte:head>
	<title>{title || "on that note"}</title>
</svelte:head>

<svelte:window on:click|once={makeNote}></svelte:window>

<main>
	<div>
		<input class="title" bind:value={title} on:keyup={storeLocally} autofocus>
	</div>
	<div>
		<div class="limit">{newNote.length}/35</div>
		<input placeholder="add a new task" maxlength="35" bind:value={newNote} on:keydown={handleKeydown}>
	</div>
	{#if taskExists }<div class="errorMessage" transition:slide>Task already exists</div>{/if}
	{#if maxWordLimitReached }<div class="errorMessage" transition:slide>Reached maximum length</div>{/if}
	{#if completedTaskExists}<div class="errorMessage" transition:slide>Task already completed</div>{/if}
	{#if isTasksVisible}
		<div class="flex" transition:fade>
				<ul class="pending">
					<li class="listTitle">In Progress ({tasks.length}/{total})</li>
					{#each tasks as task}
						<div class="taskWrapper" transition:slide>
							<li on:click={done(task)}>{task}</li><img class="deleteTask" src="deleteIcon.svg" on:click={deleteTodo(task,true)}>
						</div>
					{/each}
				</ul>
				<ul class="completed">
					<li class="listTitle">Completed ({completedTasks.length}/{total})</li>
					{#each completedTasks as completedTask}
						<li transition:slide on:click={uncheck(completedTask)}>{completedTask}</li>
					{/each}
				</ul>
		</div>
	{/if}
</main>
<footer>
	<!-- {hits} -->
	<li on:click={startOver}>Delete history / Make a new list</li>
	<li class="secondary">{hits || "..."} happy souls</li>
	<li class="secondary" on:click={()=>location.href="https://github.com/rohanharikr/onthatnote/tree/svelte"}>Code on Github • {id}</li>
	<li class="secondary">Hosted on now</li>
	<li class="secondary" on:click={()=>location.href="https://www.twitter.com/rohanharikr"}>Made with Svelte by rohanharikr</li>
</footer>


<style>
	main{
		width: 80%;
		margin: auto;
		padding: 20px 0;
		position: relative;
	}

	footer{
		width: 80%;
		display: flex;
		bottom: 20px;
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		padding: 8px;
		font-size: 12px;
	}

	footer .secondary{
		opacity: 0.4;
	}

	footer li{
		margin-right: 10px;
	}

	footer li:hover{
		cursor: pointer;
		text-decoration: none;
	}

	.title{
		border:none;
		margin-bottom: 40px;
		font-size: 18px;
		font-weight: 600;
	}

	li{
		padding: 8px 0px;
		color: black;
		transition: 0.6s;
	}

	li:hover{
		text-decoration: line-through;
		cursor: pointer;
	}

	.listTitle{
		padding: 0 !important;
		margin-bottom: 10px;
		color: inherit !important;
		font-size: 12px !important;
		font-weight: 500;
		text-transform: uppercase;
	}

	.deleteTask{
		display: none;
		height: 12px;
		float: right;
		transition: 0.2s;
		padding: 10px;
		/*background-color: #ff000008;*/
		border-radius: 50%;
	}

	.taskWrapper{
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 80%;
	}

	.taskWrapper:hover{
		background-image:linear-gradient(to right, white, #00000005);
	}

	.taskWrapper:hover .deleteTask{
		display: block;
	}

	.errorMessage{
		font-size: 14px;
		opacity: 0.8;
	}

	.listTitle:hover{
		text-decoration: none;
		cursor: auto;
	}

	.completed li:hover{
		text-decoration: none !important;
	}

	input{
		width: 100%;
		border: none;
		border-bottom: 1px solid #d3d3d3;
		border-radius: 0;
		padding-bottom: 16px;
	}

	.completed .listTitle{
		text-decoration: none !important;
		opacity: 1 !important;
	}

	.completed li{
		text-decoration: line-through !important;
		opacity: 0.4;
	}

	input[type="checkbox"]{
		border: 1px solid black;
	}

	input::placeholder{
		opacity: 0.2;
	}

	.taskTile{
		display: flex;
	}

	.flex{
		display: flex;
		margin-top: 60px;
	}

	ul h2{
		color: #7d7d7d;
		text-transform: uppercase;
		font-size: 12px;
		font-weight: 500;
	}

	.pending, .completed{
		width: 50%;
	}

	input:focus{
 	   outline: none;
	}

	.limit{
		text-align: right;
		font-size: 12px !important;
		position: absolute;
		right: 10px;
		top: 112px;
	}

	li{
		list-style: none;
	}

	ul{
		margin: 0;
		padding: 0;
	}

	ul li {
		width: auto;
	}


	@media only screen and (max-width: 600px){
		main{
			width: 90%;
			padding: 10px 0;
		}
		.flex{
			flex-direction: column;
			width: 100%;
		}

		ul{
			width: 100% !important;
		}

		footer{
			width: 82%;
		}

		li{
			width: 100% !important;
		}
		.taskWrapper{
			width: 100% !important;
		}
		.completed{
			margin-top: 46px;
		}
		.deleteTask{
			display: block;
		}

		footer .secondary{
			display: none;
		}
	}

</style>
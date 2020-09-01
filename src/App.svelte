<script>
	import { slide, fade } from 'svelte/transition';

	let newNote = ""
	let isTasksVisible = false
	let taskExists = false
	let completedTaskExists = false
	let maxWordLimitReached = false

	let title

	$: total = 0
	$: tasks = []
	$: completedTasks = []

	function addTodo(){
		if (!tasks.includes(newNote) && !completedTasks.includes(newNote)){
			tasks = [...tasks, newNote]
			newNote = ""
			total++
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
	}

	function deleteTodo(i,del){
		tasks = tasks.filter(function(value){ 
			return value !== i
		})

		if(total === 0 && completedTasks.length === 0){
			isTasksVisible = false
		}

		if(del == true){
			total--;
		}
	}

	function done(i){
		completedTasks = [...completedTasks, i]
		deleteTodo(i);
		console.log(completedTasks);
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
	}
</script>

<svelte:head>
	<title>{title || "on that note"}</title>
</svelte:head>

<main>
	<input placeholder="add a new task" maxlength="35" bind:value={title} on:keydown={handleKeydown}>
	{#if taskExists }<div class="errorMessage" transition:slide>Task already exists</div>{/if}
	{#if maxWordLimitReached }<div class="errorMessage" transition:slide>Reached maximum length</div>{/if}
	{#if completedTaskExists}<div class="errorMessage" transition:slide>Task already completed</div>{/if}
	<div class="limit">{newNote.length}/35</div>
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

<style>
	main{
		width: 80%;
		margin: auto;
		padding: 60px 0;
		position: relative;
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
		top: 68px;
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

</style>
<script lang="ts">
let {
	label,
	id,
	value = $bindable(''),
	...rest
}: {
	label: string
	id: string
	value?: string
	[key: string]: unknown
} = $props()
</script>

<div>
	<label for={id}>{label}</label>
	<input {id} bind:value {...rest} />
</div>

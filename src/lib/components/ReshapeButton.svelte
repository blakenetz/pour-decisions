<script lang="ts">
  export let as: keyof HTMLElementTagNameMap = 'button';
</script>

<svelte:element
  this={as}
  {...$$restProps}
  class={`reshape relative inline-flex items-center justify-center w-[175px] h-[120px] text-white bg-transparent select-none ${$$restProps.class ?? ''}`}
  type={as === 'button' ? 'button' : undefined}
>
  <span class="block transition-transform duration-300 ease-linear mix-blend-difference">
    <slot>Reshape</slot>
  </span>
</svelte:element>

<style>
  .reshape {
    font-family: freight-display-pro, serif;
    font-weight: 900;
    width: 175px;
    height: 120px;
    color: #fff;
    background: none;
  }

  .reshape::before,
  .reshape::after {
    position: absolute;
    content: '';
    left: 0;
    top: 0;
  }

  .reshape::before {
    right: 0;
    bottom: 0;
    background: #e6e6e6;
    -webkit-clip-path: path("M154.5,88.5 C131,113.5 62.5,110 30,89.5 C-2.5,69 -3.5,42 4.5,25.5 C12.5,9 33.5,-6 85,3.5 C136.5,13 178,63.5 154.5,88.5 Z");
    clip-path: path("M154.5,88.5 C131,113.5 62.5,110 30,89.5 C-2.5,69 -3.5,42 4.5,25.5 C12.5,9 33.5,-6 85,3.5 C136.5,13 178,63.5 154.5,88.5 Z");
    transition: clip-path 0.5s cubic-bezier(0.585, 2.5, 0.645, 0.55), -webkit-clip-path 0.5s cubic-bezier(0.585, 2.5, 0.645, 0.55), background 0.5s ease;
    z-index: -2;
  }

  .reshape:hover::before {
    background: #000;
    -webkit-clip-path: path("M143,77 C117,96 74,100.5 45.5,91.5 C17,82.5 -10.5,57 5.5,31.5 C21.5,6 79,-5.5 130.5,4 C182,13.5 169,58 143,77 Z");
    clip-path: path("M143,77 C117,96 74,100.5 45.5,91.5 C17,82.5 -10.5,57 5.5,31.5 C21.5,6 79,-5.5 130.5,4 C182,13.5 169,58 143,77 Z");
  }

  .reshape::after {
    height: 86%;
    width: 97%;
    top: 5%;
    left: 1.5%;
    border-radius: 58% 42% 55% 45% / 56% 45% 55% 44%;
    border: 1px solid #000;
    transform: rotate(-20deg);
    z-index: -1;
    transition: transform 0.5s cubic-bezier(0.585, 2.5, 0.645, 0.55);
  }

  .reshape:hover::after {
    transform: translate3d(0, -5px, 0);
  }

  .reshape span {
    display: block;
    transition: transform 0.3s ease;
    mix-blend-mode: difference;
  }

  .reshape:hover span {
    transform: translate3d(0, -10px, 0);
  }
</style>

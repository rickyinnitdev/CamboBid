<script setup>
import { computed } from "vue";

const props = defineProps({
  color: { type: String, default: "#C08A2E" },
  opacity: { type: Number, default: 0.16 },
  strokeWidth: { type: Number, default: 1.1 },
  variant: { type: String, default: "full" },
});

const uid = `khmer-arch-${Math.random().toString(36).slice(2, 9)}`;

const showWaves = computed(() => ["full", "wave"].includes(props.variant));
const showLeft = computed(() => ["full", "corners", "left"].includes(props.variant));
const showRight = computed(() => ["full", "corners", "right"].includes(props.variant));
const showOrnaments = computed(() => props.variant === "full");
</script>

<template>
  <div
    class="pointer-events-none absolute inset-0 overflow-hidden"
    :style="{ opacity }"
    aria-hidden="true"
  >
    <!-- Shared artwork, referenced by the layers below ------------------- -->
    <svg class="absolute h-0 w-0" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Angkor-inspired temple complex: tiered prangs, lotus-bud
             finials, gallery pavilions and a stepped stone terrace. -->
        <g
          :id="`${uid}-temple`"
          fill="none"
          :stroke="color"
          :stroke-width="strokeWidth"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M4 556h472" opacity=".35" />

          <path d="M28 556v-28h424v28" />
          <path d="M48 528v-22h384v22" />
          <path d="M68 506v-20h344v20" />
          <path d="M48 528h384M68 506h344" opacity=".55" />
          <path
            d="M88 556v-28M124 556v-28M160 556v-28M196 556v-28M232 556v-28M268 556v-28M304 556v-28M340 556v-28M376 556v-28"
            opacity=".25"
          />
          <path
            d="M48 526h384"
            stroke-dasharray="1 9"
            opacity=".45"
          />

          <!-- Central prang -->
          <path
            d="M196 486v-26h6v-26h6v-26h6v-26h6v-26h5v-26c0-26 6-52 15-74 9 22 15 48 15 74v26h5v26h6v26h6v26h6v26h6v26"
            :fill="color"
            fill-opacity=".035"
          />
          <path d="M240 256c-6-11-6-23 0-34 6 11 6 23 0 34Z" />
          <path d="M240 222v-14" />
          <path d="M240 208l6-8-6-8-6 8Z" opacity=".7" />
          <path
            d="M202 460h76M208 434h64M214 408h52M220 382h40M225 356h30M226 330h28"
            opacity=".55"
          />
          <path
            d="M232 460v-20c0-5 4-8 8-8s8 3 8 8v20"
            opacity=".45"
          />
          <path
            d="M236 408v-16c0-3 2-5 4-5s4 2 4 5v16"
            opacity=".45"
          />

          <!-- Flanking prangs -->
          <path
            d="M116 486v-22h5v-24h5v-24h5v-24h5v-20c0-24 6-44 14-62 8 18 14 38 14 62v20h5v24h5v24h5v24h5v22"
          />
          <path d="M150 310c-5-9-5-19 0-28 5 9 5 19 0 28Z" />
          <path d="M150 282v-10" />
          <path d="M150 272l4-6-4-6-4 6Z" opacity=".7" />
          <path
            d="M121 464h58M126 440h48M131 416h38M136 392h28"
            opacity=".5"
          />

          <path
            d="M296 486v-22h5v-24h5v-24h5v-24h5v-20c0-24 6-44 14-62 8 18 14 38 14 62v20h5v24h5v24h5v24h5v22"
          />
          <path d="M330 310c-5-9-5-19 0-28 5 9 5 19 0 28Z" />
          <path d="M330 282v-10" />
          <path d="M330 272l4-6-4-6-4 6Z" opacity=".7" />
          <path
            d="M301 464h58M306 440h48M311 416h38M316 392h28"
            opacity=".5"
          />

          <!-- Gallery pavilions -->
          <path d="M68 486v-24h34v24M68 462l17-12 17 12" />
          <path d="M378 486v-24h34v24M378 462l17-12 17 12" />
          <path
            d="M76 486v-16M94 486v-16M386 486v-16M404 486v-16"
            opacity=".4"
          />
        </g>

        <!-- Lotus-diamond medallion used as a faint edge ornament. -->
        <g
          :id="`${uid}-medallion`"
          fill="none"
          :stroke="color"
          :stroke-width="strokeWidth"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="100" cy="100" r="92" opacity=".45" />
          <circle
            cx="100"
            cy="100"
            r="70"
            stroke-dasharray="1 7"
            opacity=".6"
          />
          <path d="M100 8 192 100 100 192 8 100Z" opacity=".45" />
          <path d="M100 30 170 100 100 170 30 100Z" opacity=".65" />
          <path d="M100 54 146 100 100 146 54 100Z" opacity=".8" />
          <path d="M100 78 122 100 100 122 78 100Z" />
          <path d="M100 8c-7 14-7 26 0 38 7-12 7-24 0-38Z" />
          <path d="M192 100c-14-7-26-7-38 0 12 7 24 7 38 0Z" />
          <path d="M100 192c7-14 7-26 0-38-7 12-7 24 0 38Z" />
          <path d="M8 100c14 7 26 7 38 0-12-7-24-7-38 0Z" />
          <path d="M165 35c-13 4-21 12-25 25 13-4 21-12 25-25Z" />
          <path d="M165 165c-13-4-21-12-25-25 13 4 21 12 25 25Z" />
          <path d="M35 165c13-4 21-12 25-25-13 4-21 12-25 25Z" />
          <path d="M35 35c13 4 21 12 25 25-13-4-21-12-25-25Z" />
          <path d="M100 88c-5 6-5 12 0 18 5-6 5-12 0-18Z" />
          <circle cx="100" cy="100" r="2.5" :fill="color" stroke="none" />
        </g>

        <pattern
          :id="`${uid}-waves`"
          width="120"
          height="52"
          patternUnits="userSpaceOnUse"
        >
          <g
            fill="none"
            :stroke="color"
            :stroke-width="strokeWidth"
            stroke-linecap="round"
          >
            <path
              d="M0 20C15 20 15 6 30 6s15 14 30 14 15-14 30-14 15 14 30 14"
            />
            <path
              d="M-60 40C-45 40-45 26-30 26S-15 40 0 40s15-14 30-14 15 14 30 14 15-14 30-14 15 14 30 14"
              opacity=".6"
            />
            <path d="M30 6c-3 5-3 9 0 13 3-4 3-8 0-13Z" opacity=".7" />
            <path d="M90 6c-3 5-3 9 0 13 3-4 3-8 0-13Z" opacity=".7" />
            <path d="M0 26c-3 5-3 9 0 13 3-4 3-8 0-13Z" opacity=".5" />
            <path d="M60 26c-3 5-3 9 0 13 3-4 3-8 0-13Z" opacity=".5" />
          </g>
        </pattern>
      </defs>
    </svg>

    <!-- Faint Khmer wave field, weighted toward the lower half. A CSS mask
         is used for the fade because an SVG <mask> referenced across inline
         SVGs resolves empty in some browsers. -->
    <svg
      v-if="showWaves"
      class="khmer-wave-field absolute inset-0 h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        width="100%"
        height="100%"
        :fill="`url(#${uid}-waves)`"
        opacity=".75"
      />
    </svg>

    <!-- Edge medallions, kept clear of the central content -------------- -->
    <template v-if="showOrnaments">
      <svg
        class="absolute left-[-40px] top-[20%] hidden w-[210px] 2xl:block"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        <use :href="`#${uid}-medallion`" opacity=".6" />
      </svg>
      <svg
        class="absolute right-[-50px] top-[50%] hidden w-[230px] 2xl:block"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        <use :href="`#${uid}-medallion`" opacity=".5" />
      </svg>
    </template>

    <!-- Lower-corner temple silhouettes -------------------------------- -->
    <svg
      v-if="showLeft"
      class="absolute -bottom-px left-0 h-auto w-[clamp(200px,32vw,480px)] min-[1400px]:left-[-120px] min-[1400px]:w-[clamp(360px,30vw,460px)]"
      viewBox="0 0 480 560"
      preserveAspectRatio="xMinYMax meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <use :href="`#${uid}-temple`" />
    </svg>
    <svg
      v-if="showRight"
      class="absolute -bottom-px right-0 h-auto w-[clamp(150px,24vw,360px)] -scale-x-100"
      viewBox="0 0 480 560"
      preserveAspectRatio="xMinYMax meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <use :href="`#${uid}-temple`" opacity=".8" />
    </svg>
  </div>
</template>

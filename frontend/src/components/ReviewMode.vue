<template>
  <div class="flex flex-col gap-4">
    <div v-if="!store.isReviewMode" class="grid grid-cols-2 gap-4">
      <div class="bg-gray-900 rounded-xl p-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-amber-300 font-bold">错题汇总</h3>
          <button v-if="store.wrongQuestionCount > 0" @click="store.clearWrongQuestions()"
            class="text-red-400 text-sm hover:underline">清空</button>
        </div>
        <div v-if="store.wrongQuestionCount === 0" class="text-center py-8">
          <div class="text-6xl mb-3">&#127942;</div>
          <p class="text-gray-400">暂无错题，继续保持！</p>
        </div>
        <div v-else class="flex flex-col gap-2">
          <div class="grid grid-cols-2 gap-2 text-center mb-2">
            <div class="bg-gray-800 rounded p-2">
              <div class="text-2xl font-bold text-red-400">{{ store.wrongQuestionCount }}</div>
              <div class="text-xs text-gray-400">错题数</div>
            </div>
            <div class="bg-gray-800 rounded p-2">
              <div class="text-2xl font-bold text-amber-400">{{ highRetryCount }}</div>
              <div class="text-xs text-gray-400">高频错题</div>
            </div>
          </div>
          <button @click="store.startReview()"
            class="w-full bg-amber-500 text-black py-3 rounded-lg text-lg font-bold hover:bg-amber-400">
            开始回炉练习
          </button>
          <div class="flex-1 overflow-y-auto max-h-64">
            <div v-for="q in store.recentWrongQuestions" :key="q.id"
              class="flex justify-between items-center bg-gray-800 rounded p-2 mb-1 text-sm border-l-4"
              :class="q.retryCount >= 3 ? 'border-red-500' : 'border-orange-400'">
              <div class="flex items-center gap-2">
                <span class="text-amber-400 font-bold text-lg">{{ q.char }}</span>
                <span class="text-gray-500">→</span>
                <span class="text-red-300 line-through">{{ q.wrongAnswer || '(空)' }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="q.retryCount >= 3" class="text-xs bg-red-900 text-red-300 px-1.5 py-0.5 rounded">易错</span>
                <span class="text-gray-500 text-xs">&times;{{ q.retryCount + 1 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-gray-900 rounded-xl p-4">
        <h3 class="text-amber-300 font-bold mb-3">错题统计</h3>
        <div v-if="store.wrongQuestionCount === 0" class="text-center py-8 text-gray-500">
          完成训练后，错题将自动归集到这里
        </div>
        <div v-else class="flex flex-col gap-3">
          <div class="bg-gray-800 rounded p-3">
            <div class="text-gray-400 text-sm mb-1">错题分布</div>
            <div class="flex flex-wrap gap-1">
              <span v-for="q in store.recentWrongQuestions" :key="q.id"
                class="px-2 py-1 rounded text-sm font-mono"
                :class="q.retryCount >= 3 ? 'bg-red-900 text-red-300' : 'bg-orange-900 text-orange-300'">
                {{ q.char }}
              </span>
            </div>
          </div>
          <div class="bg-gray-800 rounded p-3">
            <div class="text-gray-400 text-sm mb-1">重试次数分布</div>
            <div v-for="n in maxRetry" :key="n" class="flex items-center gap-2 text-sm">
              <span class="text-gray-400 w-20">第 {{ n }} 次答错:</span>
              <div class="flex-1 bg-gray-700 rounded h-4 overflow-hidden">
                <div class="bg-red-500 h-full rounded" :style="{ width: retryBarWidth(n) }"></div>
              </div>
              <span class="text-gray-300 w-8 text-right">{{ retryCountForLevel(n) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col gap-4">
      <div class="bg-gray-900 rounded-xl p-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-amber-300 font-bold">回炉练习中</h3>
          <button @click="store.exitReview()" class="text-gray-400 hover:text-white text-sm">
            退出练习
          </button>
        </div>

        <div class="mb-4">
          <div class="flex justify-between text-sm text-gray-400 mb-1">
            <span>已完成 {{ store.reviewCorrectCount }} 题</span>
            <span>剩余 {{ store.wrongQuestionCount }} 题</span>
          </div>
          <div class="w-full bg-gray-700 rounded-full h-3">
            <div class="bg-green-500 h-3 rounded-full transition-all duration-300"
              :style="{ width: store.reviewProgress + '%' }"></div>
          </div>
        </div>

        <div class="flex flex-col items-center gap-4">
          <div class="text-8xl font-bold text-amber-400">{{ store.reviewChar }}</div>
          <button @click="store.playMorse(MORSE_TABLE[store.reviewChar])" :disabled="store.isPlaying"
            class="bg-green-600 px-4 py-2 rounded hover:bg-green-500 disabled:opacity-50">
            {{ store.isPlaying ? '播放中...' : '&#128266; 播放音频' }}
          </button>
          <input v-model="store.reviewAnswer" @keyup.enter="handleReviewSubmit()"
            class="bg-gray-800 rounded px-4 py-2 text-center text-xl w-48" placeholder="输入莫尔斯码" />
          <div class="flex gap-3">
            <button @click="handleReviewSubmit()"
              class="bg-amber-500 text-black px-6 py-2 rounded hover:bg-amber-400">
              确认
            </button>
            <button @click="store.nextReviewQuestion()"
              class="bg-gray-700 text-gray-300 px-4 py-2 rounded hover:bg-gray-600">
              跳过
            </button>
          </div>
          <div v-if="feedback" class="text-lg font-bold" :class="feedbackCorrect ? 'text-green-400' : 'text-red-400'">
            {{ feedback }}
          </div>
        </div>
      </div>

      <div v-if="store.wrongQuestionCount > 0" class="bg-gray-900 rounded-xl p-4">
        <h4 class="text-gray-400 text-sm mb-2">剩余错题</h4>
        <div class="flex flex-wrap gap-1">
          <span v-for="q in store.recentWrongQuestions" :key="q.id"
            class="px-2 py-1 bg-gray-800 rounded text-sm font-mono text-red-300">
            {{ q.char }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="store.reviewCompleted" class="bg-gray-900 rounded-xl p-6 text-center">
      <div class="text-6xl mb-3">&#127881;</div>
      <h3 class="text-2xl font-bold text-green-400 mb-2">全部答对！</h3>
      <p class="text-gray-400 mb-4">恭喜，所有错题已全部通过回炉练习！</p>
      <button @click="store.exitReview()"
        class="bg-amber-500 text-black px-6 py-2 rounded hover:bg-amber-400">
        返回
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMorseStore } from '../store/morse'
import { MORSE_TABLE } from '../utils/morse-code'

const store = useMorseStore()

const feedback = ref('')
const feedbackCorrect = ref(false)

const highRetryCount = computed(() =>
  store.recentWrongQuestions.filter(q => q.retryCount >= 3).length
)

const maxRetry = computed(() => {
  if (store.recentWrongQuestions.length === 0) return 0
  return Math.max(...store.recentWrongQuestions.map(q => q.retryCount + 1))
})

function retryCountForLevel(level: number): number {
  return store.recentWrongQuestions.filter(q => q.retryCount + 1 === level).length
}

function retryBarWidth(level: number): string {
  const total = store.recentWrongQuestions.length
  if (total === 0) return '0%'
  return Math.round(retryCountForLevel(level) / total * 100) + '%'
}

function handleReviewSubmit() {
  const wrongs = store.recentWrongQuestions
  if (wrongs.length === 0) return
  const current = wrongs[store.reviewIndex]
  if (!current) return

  const correct = store.reviewAnswer.trim() === MORSE_TABLE[current.char]
  feedbackCorrect.value = correct
  feedback.value = correct
    ? '正确！'
    : `错误，正确答案: ${MORSE_TABLE[current.char]}`

  setTimeout(() => { feedback.value = '' }, 1500)
  store.checkReviewAnswer()
}
</script>

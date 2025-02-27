import type { Content, Snippets } from '@/types'
import { reactive, ref, watch, type Ref } from 'vue'
import { useContentStore } from '@/stores/useContentStore'
import { useUserStore } from '@/stores/useUserStore'
import type {
  CreatePipelineDto,
  Pipeline,
  SavePipelineDto,
  StepDto,
  StepResultDto
} from '@/types/Pipeline'
import { languages, parseLanguageFromCodeUrl } from '@/config/languagesConfig'
import { io } from 'socket.io-client'
import { socketUrl } from '@/config/constants'
import { usePipelineStore } from '@/stores/usePipelineStore'

export function usePipeline() {
  const contentStore = useContentStore()
  const userStore = useUserStore()
  const pipelineStore = usePipelineStore()

  const contents = ref(contentStore.contents as Content[])
  const snippets = ref(contentStore.snippets as Snippets[])
  const myPipelines = ref(pipelineStore.pipelines as Pipeline[])

  watch(contentStore, (newVal) => {
    contents.value = newVal.contents
    snippets.value = newVal.snippets
  })

  watch(pipelineStore, (newVal) => {
    myPipelines.value = newVal.pipelines
  })

  const error = ref<string>('')
  const errorDialog = ref<string>('')

  const form = ref(null)
  const formValid = ref(false)
  const initialInput = ref<File | null>(null)

  const saveDialog = ref(false)
  const myPipelinesDialog = ref(false)
  const pipelineName = ref('')
  const pipelineDescription = ref('')

  if (userStore.user) {
    contentStore.fetchContentsByOwner(userStore.user.id).catch((error) => {
      console.error('Error fetching contents:', error)
    })
  } else {
    userStore
      .fetchUserProfile()
      .then((user) => {
        contentStore.fetchContentsByOwner(user.id).catch((error) => {
          console.error('Error fetching contents:', error)
        })
      })
      .catch((error) => {
        console.error('Error fetching user profile:', error)
      })
  }

  const steps = reactive<CreatePipelineDto>({
    steps: [
      {
        service: 'dyno-code',
        endpoint: 'execute',
        payload: { code: '', language: languages[0], input_file: undefined }
      }
    ]
  })
  const results = ref<StepResultDto[]>([])
  const socket = io(socketUrl)
  const rules = {
    required: (v: any) => !!v || 'Field is required'
  }

  const addStep = () => {
    if (form.value) {
      steps.steps.push({
        service: 'dyno-code',
        endpoint: 'execute',
        payload: { code: '', language: languages[0], input_file: undefined }
      })
    }
  }

  const submitPipeline = async () => {
    if (form.value) {
      if (initialInput.value) {
        steps.steps[0].payload.input_file = await fileToBase64(initialInput.value)
      }
      for (let i = 1; i < steps.steps.length; i++) {
        steps.steps[i].payload.input_file = base64ToFileObject(
          results.value[i - 1]?.output_file_content,
          'output'
        )
      }
      socket.emit('executePipeline', steps)
    } else {
      console.error('Form is not valid')
    }
  }
  const validateForm = () => {
    formValid.value =
      initialInput.value !== undefined &&
      steps.steps.every((step) => {
        if (step.payload.snippet) {
          step.payload.code = step.payload.snippet.code
          step.payload.language = parseLanguageFromCodeUrl(step.payload.snippet.code)
          step.payload.owner_id = step.payload.snippet.owner_id
          step.payload.codeId = step.payload.snippet.id
          step.payload.output_extension = step.payload.snippet.output_type
        }
        const isValid = !!step.payload.code
        step.payload.language = parseLanguageFromCodeUrl(step.payload.code)
        return isValid
      })
  }
  const savePipeline = async () => {
    if (form.value) {
      const user = userStore.user
      if (!user) {
        console.error('User not authenticated')
        error.value = 'User not authenticated'
        return
      }

      const stepCodes = steps.steps.map((step) => step.payload.codeId)
      const savePipelineDto: SavePipelineDto = {
        owner_id: user.id,
        name: pipelineName.value,
        description: pipelineDescription.value,
        steps: stepCodes
      }
      socket.emit('pipelineSave', savePipelineDto)
    } else {
      console.error('Form is not valid')
    }
  }
  const fetchMyPipelines = async () => {
    if (userStore.user) {
      await pipelineStore.fetchPipelineByOwner(userStore.user.id)
    }
  }
  const saveDialogPipeline = async () => {
    if (pipelineName.value && pipelineDescription.value) {
      await savePipeline()
      saveDialog.value = false
    } else {
      console.error('Name and description are required')
      error.value = 'Name and description are required'
    }
  }

  const openSaveDialog = () => {
    saveDialog.value = true
  }

  const closeSaveDialog = () => {
    saveDialog.value = false
  }

  const openMyPipelinesDialog = async () => {
    await pipelineStore.fetchPipelineByOwner(userStore.user?.id || 0)

    myPipelinesDialog.value = true
  }

  const closeMyPipelinesDialog = () => {
    myPipelinesDialog.value = false
  }

  const loadPipeline = (pipeline: Pipeline) => {
    steps.steps = pipeline.steps.map((stepId) => {
      const snippet = snippets.value.find((snippet) => snippet.id === stepId)
      return {
        service: 'dyno-code',
        endpoint: 'execute',
        payload: {
          code: snippet?.code || '',
          language: parseLanguageFromCodeUrl(snippet?.code || ''),
          input_file: undefined,
          snippet: snippet || undefined
        }
      }
    })
    closeMyPipelinesDialog()
  }
  const deletePipeline = async (id: string) => {
    await pipelineStore.deletePipeline(id)
  }

  /** PRIVATE FUNCTION */
  function fileToBase64(file: File): Promise<{ name: string; data: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ name: file.name, data: reader.result as string })
      reader.onerror = (error) => reject(error)
      reader.readAsDataURL(file)
    })
  }
  function base64ToFileObject(
    base64Data: string | undefined,
    fileName: string
  ): { name: string; data: string } {
    return { name: fileName, data: base64Data ?? '' }
  }
  return {
    contents,
    snippets,
    error,
    errorDialog,
    form,
    formValid,
    initialInput,
    steps,
    results,
    addStep,
    submitPipeline,
    validateForm,
    socket,
    rules,
    savePipeline,
    pipelineName,
    pipelineDescription,
    saveDialog,
    openSaveDialog,
    closeSaveDialog,
    saveDialogPipeline,
    myPipelinesDialog,
    myPipelines,
    openMyPipelinesDialog,
    closeMyPipelinesDialog,
    loadPipeline,
    fetchMyPipelines,
    deletePipeline
  }
}

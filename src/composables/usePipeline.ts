import type { Content, Snippets } from "@/types";
import { reactive, ref, watch, type Ref } from "vue";
import { useContentStore } from "@/stores/useContentStore";
import { useUserStore } from "@/stores/useUserStore";
import type { CreatePipelineDto, SavePipelineDto, StepDto, StepResultDto } from "@/types/Pipeline";
import { languages, parseLanguageFromCodeUrl } from "@/config/languagesConfig";
import { io } from "socket.io-client";

export function usePipeline() {
    const contentStore = useContentStore();
    const userStore = useUserStore();

    const contents = ref(contentStore.contents as Content[]);
    const snippets = ref(contentStore.snippets as Snippets[])

    watch(contentStore, (newVal) => {
        contents.value = newVal.contents;
        snippets.value = newVal.snippets;
    });


    const error = ref<string>('');
    const errorDialog = ref<string>('');

    const form = ref(null);
    const formValid = ref(false)
    const initialInput = ref<File | null>(null);

    const dialog = ref(false);
    const pipelineName = ref('');
    const pipelineDescription = ref('');

    if (userStore.user) {
        contentStore.fetchContentsByOwner(userStore.user.id).catch((error) => {
            console.error('Error fetching contents:', error);
        });
    } else {
        userStore.fetchUserProfile()
            .then((user) => {
                contentStore.fetchContentsByOwner(user.id).catch((error) => {
                    console.error('Error fetching contents:', error);
                });
            })
            .catch((error) => {
                console.error('Error fetching user profile:', error);
            });
    }


    const steps = reactive<CreatePipelineDto>({
        steps: [
            { service: 'dyno-code', endpoint: 'execute', payload: { code: '', language: languages[0], input_file: undefined } }
        ]
    })
    const results = ref<StepResultDto[]>([])
    const socket = io('wss://pipeline-orchestrator.code-valley.xyz')
    //const socket = io('ws://localhost:3000')
    const rules = {
        required: (v: any) => !!v || 'Field is required'
    }

    const addStep = () => {
        if (form.value) {
            steps.steps.push({
                service: 'dyno-code',
                endpoint: 'execute',
                payload: { code: '', language: languages[0], input_file: undefined },
            });
        }
    };

    const submitPipeline = async () => {
        if (form.value) {
            if (initialInput.value) {
                steps.steps[0].payload.input_file = await fileToBase64(initialInput.value);
            }
            for (let i = 1; i < steps.steps.length; i++) {
                steps.steps[i].payload.input_file = base64ToFileObject(results.value[i - 1]?.output_file_content, 'output');
            }
            socket.emit('executePipeline', steps);
        } else {
            console.error('Form is not valid');
        }
    };
    const validateForm = () => {
        formValid.value = (initialInput.value !== undefined) &&
            steps.steps.every((step) => {
                if (step.payload.snippet) {
                    step.payload.code = step.payload.snippet.code;
                    step.payload.language = parseLanguageFromCodeUrl(step.payload.snippet.code);
                    step.payload.owner_id = step.payload.snippet.owner_id;
                    step.payload.codeId = step.payload.snippet.id;
                }

                const isValid = !!step.payload.code;

                step.payload.language = parseLanguageFromCodeUrl(step.payload.code);
                return isValid;
            });
    };
    const savePipeline = async () => {
        if (form.value) {
            const user = userStore.user;
            if (!user) {
                console.error('User not authenticated');
                error.value = 'User not authenticated';
                return;
            }

            const stepCodes = steps.steps.map(step => step.payload.codeId);
            const savePipelineDto: SavePipelineDto = {
                owner_id: user.id,
                name: pipelineName.value,
                description: pipelineDescription.value,
                steps: stepCodes
            };
            socket.emit('pipelineSave', savePipelineDto);
        } else {
            console.error('Form is not valid');
        }
    };

    const openDialog = () => {
        dialog.value = true;
    };

    const closeDialog = () => {
        dialog.value = false;
    };

    const saveDialogPipeline = async () => {
        if (pipelineName.value && pipelineDescription.value) {
            await savePipeline();
            dialog.value = false;
        } else {
            console.error('Name and description are required');
            errorDialog.value = 'Name and description are required';
        }
    };
    /** PRIVATE FUNCTION */
    function fileToBase64(file: File): Promise<{ name: string, data: string }> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ name: file.name, data: reader.result as string });
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    };
    function base64ToFileObject(base64Data: string | undefined, fileName: string): { name: string, data: string } {
        return { name: fileName, data: base64Data ?? '' };
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
        dialog,
        pipelineName,
        pipelineDescription,
        openDialog,
        closeDialog,
        saveDialogPipeline,
    };


}

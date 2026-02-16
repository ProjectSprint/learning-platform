import type { QuestionRuntime as __QuestionRuntime } from "../../internal/runtime/context/use-question-runtime";
import type {
	ExecutionFlowApi as __ExecutionFlowApi,
	InteractionSessionApi as __InteractionSessionApi,
	ProgressApi as __ProgressApi,
	RuntimeApiFailure as __RuntimeApiFailure,
	RuntimeApiResult as __RuntimeApiResult,
	RuntimeApiSuccess as __RuntimeApiSuccess,
	WorldApi as __WorldApi,
} from "../../internal/runtime/wrappers";

type _QuestionRuntime<TContext = Record<string, never>> =
	__QuestionRuntime<TContext>;
type _ExecutionFlowApi = __ExecutionFlowApi;
type _InteractionSessionApi = __InteractionSessionApi;
type _ProgressApi = __ProgressApi;
type _RuntimeApiFailure = __RuntimeApiFailure;
type _RuntimeApiResult = __RuntimeApiResult;
type _RuntimeApiSuccess = __RuntimeApiSuccess;
type _WorldApi = __WorldApi;

export type QuestionRuntime<TContext = Record<string, never>> =
	_QuestionRuntime<TContext>;
export type ExecutionFlowApi = _ExecutionFlowApi;
export type InteractionSessionApi = _InteractionSessionApi;
export type ProgressApi = _ProgressApi;
export type RuntimeApiFailure = _RuntimeApiFailure;
export type RuntimeApiResult = _RuntimeApiResult;
export type RuntimeApiSuccess = _RuntimeApiSuccess;
export type WorldApi = _WorldApi;

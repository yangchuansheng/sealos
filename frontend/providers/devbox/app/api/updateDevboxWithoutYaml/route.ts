import { NextRequest } from 'next/server';
import { infoLog } from 'sealos-desktop-sdk';
import { PatchUtils } from '@kubernetes/client-node';

import { YamlKindEnum } from '@/constants/devbox';
import { jsonRes } from '@/services/backend/response';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import type { DevboxEditTypeV2, DevboxKindsType } from '@/types/devbox';
import { generateYamlList } from '@/utils/json2Yaml';
import { patchYamlList } from '@/utils/tools';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { oldFormData, newFormData } = (await req.json()) as {
      oldFormData: DevboxEditTypeV2;
      newFormData: DevboxEditTypeV2;
    };

    const newYamlList = generateYamlList(newFormData, {
      devboxAffinityEnable: process.env.DEVBOX_AFFINITY_ENABLE!,
      squashEnable: process.env.SQUASH_ENABLE!,
      ingressSecret: process.env.INGRESS_SECRET!
    });
    const oldYamlList = generateYamlList(oldFormData, {
      devboxAffinityEnable: process.env.DEVBOX_AFFINITY_ENABLE!,
      squashEnable: process.env.SQUASH_ENABLE!,
      ingressSecret: process.env.INGRESS_SECRET!
    });

    const parsedNewYamlList = newYamlList.map((item) => item.value);
    const parsedOldYamlList = oldYamlList.map((item) => item.value);
    const areYamlListsEqual =
      new Set(parsedNewYamlList).size === new Set(parsedOldYamlList).size &&
      [...new Set(parsedNewYamlList)].every((item) => new Set(parsedOldYamlList).has(item));
    if (areYamlListsEqual) {
      return jsonRes({
        code: 500,
        error: 'form not changed'
      });
    }
    if (!parsedNewYamlList) {
      // prevent empty yamlList
      return jsonRes({
        code: 500,
        error: 'formData can not be empty'
      });
    }
    const patch = patchYamlList({
      parsedOldYamlList: parsedOldYamlList,
      parsedNewYamlList: parsedNewYamlList,
      originalYamlList: parsedNewYamlList as DevboxKindsType[]
    });

    if (!patch || patch.length === 0) {
      return jsonRes({
        code: 500,
        error: 'params error'
      });
    }

    const headerList = req.headers;

    const { applyYamlList, k8sCore, k8sNetworkingApp, k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    const crMap: Record<
      `${YamlKindEnum}`,
      {
        patch: (jsonPatch: Object) => Promise<any>;
        delete: (name: string) => Promise<any>;
      }
    > = {
      [YamlKindEnum.Devbox]: {
        patch: (jsonPatch: Object) => {
          // @ts-ignore
          const name = jsonPatch?.metadata?.name;
          return k8sCustomObjects.patchNamespacedCustomObject(
            'devbox.sealos.io',
            'v1alpha1',
            namespace,
            'devboxes',
            name,
            jsonPatch,
            undefined,
            undefined,
            undefined,
            { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }
          );
        },
        delete: (name) =>
          k8sCustomObjects.deleteNamespacedCustomObject(
            'devbox.sealos.io',
            'v1alpha1',
            namespace,
            'devboxes',
            name
          )
      },
      [YamlKindEnum.Service]: {
        patch: (jsonPatch: Object) =>
          k8sCore.replaceNamespacedService(newFormData.name, namespace, jsonPatch),
        delete: (name) => k8sCore.deleteNamespacedService(name, namespace)
      },
      [YamlKindEnum.Ingress]: {
        patch: (jsonPatch: any) =>
          k8sNetworkingApp.patchNamespacedIngress(
            jsonPatch?.metadata?.name,
            namespace,
            jsonPatch,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }
          ),
        delete: (name) => k8sNetworkingApp.deleteNamespacedIngress(name, namespace)
      },
      [YamlKindEnum.Issuer]: {
        patch: (jsonPatch: Object) => {
          // @ts-ignore
          const name = jsonPatch?.metadata?.name;
          return k8sCustomObjects.patchNamespacedCustomObject(
            'cert-manager.io',
            'v1',
            namespace,
            'issuers',
            name,
            jsonPatch,
            undefined,
            undefined,
            undefined,
            { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }
          );
        },
        delete: (name) =>
          k8sCustomObjects.deleteNamespacedCustomObject(
            'cert-manager.io',
            'v1',
            namespace,
            'issuers',
            name
          )
      },
      [YamlKindEnum.Certificate]: {
        patch: (jsonPatch: Object) => {
          // @ts-ignore
          const name = jsonPatch?.metadata?.name;
          return k8sCustomObjects.patchNamespacedCustomObject(
            'cert-manager.io',
            'v1',
            namespace,
            'certificates',
            name,
            jsonPatch,
            undefined,
            undefined,
            undefined,
            { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }
          );
        },
        delete: (name) =>
          k8sCustomObjects.deleteNamespacedCustomObject(
            'cert-manager.io',
            'v1',
            namespace,
            'certificates',
            name
          )
      }
    };

    // patch
    await Promise.all(
      patch.map((item) => {
        const cr = crMap[item.kind];
        if (!cr || item.type !== 'patch' || !item.value?.metadata) {
          return;
        }
        infoLog('patch cr', { kind: item.kind, name: item.value?.metadata?.name });
        return cr.patch(item.value);
      })
    );

    // create
    const createYamlList = patch
      .map((item) => {
        const cr = crMap[item.kind];
        if (!cr || item.type !== 'create') {
          return;
        }
        return item.value;
      })
      .filter((item) => item);
    await applyYamlList(createYamlList as string[], 'create');

    // delete
    await Promise.all(
      patch.map((item) => {
        const cr = crMap[item.kind];
        if (!cr || item.type !== 'delete' || !item?.name) {
          return;
        }
        infoLog('delete cr', { kind: item.kind, name: item?.name });
        return cr.delete(item.name);
      })
    );

    return jsonRes({
      data: 'success update devbox'
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}

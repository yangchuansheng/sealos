import type { NextApiRequest, NextApiResponse } from 'next';

import { authSession } from '@/services/backend/auth';
import { CRDMeta, getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { instanceName } = req.query as { instanceName: string };
    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const customResource: CRDMeta = {
      group: 'app.sealos.io',
      version: 'v1',
      namespace: namespace,
      plural: 'apps'
    };

    // 删除指定名称的自定义资源
    const reuslt = await k8sCustomObjects.deleteNamespacedCustomObject(
      customResource.group,
      customResource.version,
      customResource.namespace,
      customResource.plural,
      instanceName
    );

    jsonRes(res, { data: reuslt });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { EnvResponse } from '@/types/index';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  jsonRes<EnvResponse>(res, {
    data: {
      domain: process.env.SEALOS_DOMAIN || 'cloud.sealos.io'
    }
  });
}

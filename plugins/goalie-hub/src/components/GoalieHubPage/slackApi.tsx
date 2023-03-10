/*
 * Copyright 2023 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useMemo } from 'react';
import useAsync from 'react-use/lib/useAsync';

import {
  fetchApiRef,
  configApiRef,
  slackAuthApiRef,
  useApi,
} from '@backstage/core-plugin-api';

type Fetch = (
  input: RequestInfo | URL,
  init?: RequestInit | undefined,
) => Promise<Response>;

class SlackApi {
  private token: string;
  private baseUrl: string;
  private fetch: Fetch;

  private constructor(token: string, baseUrl: string, fetch: Fetch) {
    this.token = token;
    this.baseUrl = baseUrl;
    this.fetch = fetch;
  }

  static fromConfig({
    token,
    fetch,
    baseUrl,
  }: {
    token: string;
    baseUrl: string;
    fetch: Fetch;
  }) {
    return new SlackApi(token, baseUrl, fetch);
  }

  public async search({
    query,
    page = 1,
    limit: count = 5,
  }: {
    query: string;
    page?: number;
    limit?: number;
  }) {
    const response = await this.fetch(
      `${
        this.baseUrl
      }/api/proxy/slack/search.messages?query=${encodeURIComponent(
        query,
      )}&page=${page}&count=${count}`,
      {
        method: 'POST',
        body: `token=${this.token}`,
        headers: {
          'Content-type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return response.json();
  }
}

export const useSlackApi = () => {
  const fetchApi = useApi(fetchApiRef);
  const configApi = useApi(configApiRef);
  const slackAuthApi = useApi(slackAuthApiRef);

  const { value: token } = useAsync(async () => {
    return await slackAuthApi.getAccessToken();
  }, [slackAuthApi]);

  return useMemo(() => {
    if (!token) return null;
    const fetch = fetchApi.fetch;
    const baseUrl = configApi.getString('backend.baseUrl');
    return SlackApi.fromConfig({ token, fetch, baseUrl });
  }, [token, fetchApi, configApi]);
};

/*
 * Copyright 2020 The Backstage Authors
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

import express from 'express';
import passport from 'passport';
import { OAuth2Client } from 'google-auth-library';
import { Strategy as SlackStrategy } from 'passport-slack-oauth2';
import {
  encodeState,
  OAuthAdapter,
  OAuthEnvironmentHandler,
  OAuthHandlers,
  OAuthProviderOptions,
  OAuthRefreshRequest,
  OAuthResponse,
  OAuthResult,
  OAuthStartRequest,
  OAuthLogoutRequest,
} from '../../lib/oauth';
import {
  executeFetchUserProfileStrategy,
  executeFrameHandlerStrategy,
  executeRedirectStrategy,
  executeRefreshTokenStrategy,
  makeProfileInfo,
  PassportDoneCallback,
} from '../../lib/passport';
import {
  AuthHandler,
  AuthResolverContext,
  OAuthStartResponse,
  SignInResolver,
} from '../types';
import { createAuthProviderIntegration } from '../createAuthProviderIntegration';

type PrivateInfo = {
  refreshToken: string;
};

type SlackAuthProviderOptions = OAuthProviderOptions & {
  scope: string[];
  signInResolver?: SignInResolver<OAuthResult>;
  authHandler: AuthHandler<OAuthResult>;
  resolverContext: AuthResolverContext;
};

export class SlackAuthProvider implements OAuthHandlers {
  private readonly strategy: SlackStrategy;
  private readonly signInResolver?: SignInResolver<OAuthResult>;
  private readonly authHandler: AuthHandler<OAuthResult>;
  private readonly resolverContext: AuthResolverContext;

  constructor(options: SlackAuthProviderOptions) {
    this.authHandler = options.authHandler;
    this.signInResolver = options.signInResolver;
    this.resolverContext = options.resolverContext;

    this.strategy = new SlackStrategy(
      {
        clientID: options.clientId,
        clientSecret: options.clientSecret,
        scope: options.scope,
      },
      (
        accessToken: any,
        refreshToken: any,
        params: any,
        fullProfile: passport.Profile,
        done: PassportDoneCallback<OAuthResult, PrivateInfo>,
      ) => {
        done(
          undefined,
          {
            fullProfile,
            params,
            accessToken,
            refreshToken,
          },
          {
            refreshToken,
          },
        );
      },
    );
  }

  async start(req: OAuthStartRequest): Promise<OAuthStartResponse> {
    return await executeRedirectStrategy(req, this.strategy, {
      accessType: 'offline',
      prompt: 'consent',
      scope: req.scope,
      state: encodeState(req.state),
    });
  }

  async handler(req: express.Request) {
    const { result, privateInfo } = await executeFrameHandlerStrategy<
      OAuthResult,
      PrivateInfo
    >(req, this.strategy);

    return {
      response: await this.handleResult(result),
      refreshToken: privateInfo.refreshToken,
    };
  }

  async logout(req: OAuthLogoutRequest) {
    const oauthClient = new OAuth2Client();
    await oauthClient.revokeToken(req.refreshToken);
  }

  async refresh(req: OAuthRefreshRequest) {
    const { accessToken, refreshToken, params } =
      await executeRefreshTokenStrategy(
        this.strategy,
        req.refreshToken,
        req.scope,
      );

    const fullProfile = await executeFetchUserProfileStrategy(
      this.strategy,
      accessToken,
    );

    return {
      response: await this.handleResult({
        fullProfile,
        params,
        accessToken,
      }),
      refreshToken,
    };
  }

  private async handleResult(result: OAuthResult) {
    const { profile } = await this.authHandler(result, this.resolverContext);

    const response: OAuthResponse = {
      providerInfo: {
        idToken: result.params.id_token,
        accessToken: result.accessToken,
        scope: result.params.scope,
        expiresInSeconds: result.params.expires_in,
      },
      profile,
    };

    if (this.signInResolver) {
      response.backstageIdentity = await this.signInResolver(
        {
          result,
          profile,
        },
        this.resolverContext,
      );
    }

    return response;
  }
}

/**
 * Auth provider integration for Google auth
 *
 * @public
 */
export const slack = createAuthProviderIntegration({
  create(options?: {
    /**
     * The profile transformation function used to verify and convert the auth response
     * into the profile that will be presented to the user.
     */
    authHandler?: AuthHandler<OAuthResult>;

    /**
     * Configure sign-in for this provider, without it the provider can not be used to sign users in.
     */
    signIn?: {
      /**
       * Maps an auth result to a Backstage identity for the user.
       */
      resolver: SignInResolver<OAuthResult>;
    };
  }) {
    return ({ providerId, globalConfig, config, resolverContext }) =>
      OAuthEnvironmentHandler.mapConfig(config, envConfig => {
        const clientId = envConfig.getString('clientId');
        const clientSecret = envConfig.getString('clientSecret');
        const customScope = envConfig.getOptionalStringArray('scope');
        const customCallbackUrl = envConfig.getOptionalString('callbackUrl');

        const callbackUrl =
          customCallbackUrl ||
          `${globalConfig.baseUrl}/${providerId}/handler/frame`;

        const scope = customScope || ['search:read'];

        const authHandler: AuthHandler<OAuthResult> = options?.authHandler
          ? options.authHandler
          : async ({ fullProfile, params }) => ({
              profile: makeProfileInfo(fullProfile, params.id_token),
            });

        const provider = new SlackAuthProvider({
          clientId,
          clientSecret,
          callbackUrl,
          scope,
          signInResolver: options?.signIn?.resolver,
          authHandler,
          resolverContext,
        });

        return OAuthAdapter.fromConfig(globalConfig, provider, {
          providerId,
          callbackUrl,
        });
      });
  },
});

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

import React, { ChangeEvent, useCallback, useEffect, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';

import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Avatar,
  Button,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Box,
  Typography,
  makeStyles,
} from '@material-ui/core';
import ChatIcon from '@material-ui/icons/Chat';
import LaunchIcon from '@material-ui/icons/Launch';
import ArrowBackIosIcon from '@material-ui/icons/ArrowBackIos';
import ArrowForwardIosIcon from '@material-ui/icons/ArrowForwardIos';

import {
  Progress,
  EmptyState,
  ResponseErrorPanel,
} from '@backstage/core-components';

import { useSlackApi } from './slackApi';

const useStyles = makeStyles({
  card: {
    height: '100%',
  },
});

export const SlackTaskList = (props: any) => {
  const classes = useStyles();
  const slackApi = useSlackApi();

  const { title, defaultQuery = '', limit = 5 } = props;

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState(defaultQuery);

  useEffect(() => {
    setPage(1);
  }, [query, setPage]);

  const { loading, error, value } = useAsync(async () => {
    return await slackApi?.search({ query, page, limit });
  }, [slackApi, query, page, limit]);

  const handleQueryChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  const handlePrevClick = useCallback(() => {
    setPage(prevPage => prevPage - 1);
  }, [setPage]);

  const handleNextClick = useCallback(() => {
    setPage(prevPage => prevPage + 1);
  }, [setPage]);

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  if (!value) {
    return <EmptyState title="No tasks found" missing="info" />;
  }

  const { messages } = value;

  return (
    <Card className={classes.card}>
      <CardHeader
        title={
          <Box
            display="grid"
            alignItems="center"
            gridAutoFlow="column"
            gridTemplateColumns="auto auto 1fr"
            gridGap="1rem"
          >
            <ChatIcon fontSize="large" />
            <Typography variant="subtitle1" noWrap>
              Slack: {title} ({messages?.total})
            </Typography>
            <TextField
              size="small"
              variant="outlined"
              type="search"
              value={query}
              onChange={handleQueryChange}
              placeholder="Search for tasks..."
            />
          </Box>
        }
        disableTypography
      />
      <CardContent>
        <List disablePadding>
          {messages?.matches.map((item: any) => (
            <ListItem key={item.iid} alignItems="flex-start" divider>
              <ListItemAvatar>
                <Avatar alt={item.username} />
              </ListItemAvatar>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{ noWrap: true }}
                secondary={`#${item.channel.name}`}
              />
              <ListItemSecondaryAction>
                <IconButton
                  color="primary"
                  href={item.permalink}
                  target="_blank"
                >
                  <LaunchIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </CardContent>
      <CardActions>
        <Button
          startIcon={<ArrowBackIosIcon />}
          onClick={handlePrevClick}
          disabled={page === 1}
        >
          Prev
        </Button>
        <Button
          endIcon={<ArrowForwardIosIcon />}
          onClick={handleNextClick}
          disabled={page === messages?.pagination.page_count}
        >
          Next
        </Button>
      </CardActions>
    </Card>
  );
};
